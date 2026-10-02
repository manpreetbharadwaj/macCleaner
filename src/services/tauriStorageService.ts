import type {
  AppFootprint,
  ApplicationItem,
  CleanupFailure,
  CleanupItem,
  CleanupSession,
  DiskSummary,
  PermissionState,
  PermissionStatus,
  SafetyLevel,
  ScanEvent,
  ScheduleRule,
  Settings,
  StorageCategory,
  TrashInfo,
  TrashTarget,
  TrashTargetsResult,
} from '@/types'
import { buildInitialScanSession } from '@/mocks'
import {
  checkPathAccess,
  getAppFootprint as bridgeGetAppFootprint,
  getAppIcon as bridgeGetAppIcon,
  getAppState,
  getLaunchAtLogin as bridgeGetLaunchAtLogin,
  getNotificationPermissionState as bridgeGetNotificationPermissionState,
  getScheduleStatus as bridgeGetScheduleStatus,
  getSystemOverview,
  getTrashInfo as bridgeGetTrashInfo,
  healSchedulePath,
  installSchedule,
  onCleanupProgress,
  onScanProgress,
  openFullDiskAccessSettings,
  openNotificationSettings as bridgeOpenNotificationSettings,
  openTrash as bridgeOpenTrash,
  quickLook as bridgeQuickLook,
  removeSchedule,
  requestNotificationPermission as bridgeRequestNotificationPermission,
  revealInFinderNative,
  runFullScan,
  saveAppState,
  setLaunchAtLogin as bridgeSetLaunchAtLogin,
  trashItems,
  uninstallApp as bridgeUninstallApp,
  type RawNotificationPermission,
} from './tauri/bridge'
import { buildRealCategories, buildRealDiskSummary, classifyFullScan, type ClassifiedScan } from './tauri/classify'
import type { RawSystemOverview } from './tauri/rawTypes'
import { nextId } from '@/mocks/seed'
import type {
  CleanItemsResult,
  CleanMode,
  CleanupProgressUpdate,
  ScanProgressUpdate,
  ScanSnapshot,
  StorageService,
} from './storageServiceTypes'
import { DEFAULT_SCHEDULE, DEFAULT_SETTINGS } from './defaults'

import { isExcluded, normalizeExclusions } from '@/lib/exclusions'
import { itemName } from '@/i18n/items'

/** The native side reports "Processing 3 of 10: name" — split it so the UI can translate it. */
function withProgressParams(update: CleanupProgressUpdate): CleanupProgressUpdate {
  const m = /^Processing (\d+) of (\d+): (.*)$/.exec(update.label)
  return m ? { ...update, params: { index: Number(m[1]), total: Number(m[2]), name: m[3] } } : update
}

interface PersistedRealState {
  settings: Settings
  schedule: ScheduleRule
  history: CleanupSession[]
  scanEvents: ScanEvent[]
}

/**
 * Loads settings/schedule/history/scanEvents from the Rust-backed state
 * file (see src-tauri/src/state.rs) — a plain JSON blob on disk, readable
 * by both this running app AND the headless `--background-scan` process,
 * which has no WebView and therefore no access to localStorage at all.
 * Missing fields (e.g. settings added in a newer version) fall back to
 * defaults, so older state files keep working.
 */
async function loadPersisted(): Promise<PersistedRealState> {
  const raw = (await getAppState()) as Partial<PersistedRealState> | null
  return {
    settings: { ...DEFAULT_SETTINGS, ...raw?.settings },
    schedule: { ...DEFAULT_SCHEDULE, ...raw?.schedule },
    history: raw?.history ?? [],
    scanEvents: raw?.scanEvents ?? [],
  }
}

function mapNotificationPermission(raw: RawNotificationPermission): PermissionState {
  return raw === 'prompt' ? 'not-requested' : raw
}

function overviewToSummary(overview: RawSystemOverview, reclaimableBytes = 0, lastScanAt: string | null = null): DiskSummary {
  return {
    totalBytes: overview.totalBytes,
    usedBytes: overview.usedBytes,
    freeBytes: overview.freeBytes,
    purgeableBytes: overview.purgeableBytes,
    reclaimableBytes,
    lastScanAt,
  }
}

/**
 * Real macOS implementation of StorageService, backed by Tauri commands.
 *
 * `settings.exclusions` is the ONE source of truth for exclusions. `this.scan`
 * holds the raw, un-excluded scan result; every read derives `excluded` (and
 * therefore categories/diskSummary/scanSession) fresh from the current
 * exclusions list, so removing a path from Settings → Exclusions makes it
 * eligible again immediately, with no rescan required.
 *
 * Every removal goes through the native `trash_items` / `uninstall_app`
 * commands, which re-validate each path independently (see
 * src-tauri/src/trash.rs and app_footprint.rs) and only ever move to Trash.
 */
export class TauriStorageService implements StorageService {
  private local: PersistedRealState | null = null
  private localPromise: Promise<PersistedRealState> | null = null
  private scan: ClassifiedScan | null = null
  private scanPromise: Promise<ClassifiedScan> | null = null
  private homeDir: string | null = null

  private async ensureLocal(): Promise<PersistedRealState> {
    if (this.local) return this.local
    if (!this.localPromise) {
      this.localPromise = loadPersisted().then((loaded) => {
        this.local = loaded
        // If a schedule is enabled, make sure the installed LaunchAgent
        // still points at this app's current path — a no-op unless the app
        // has moved since install.
        if (loaded.schedule.enabled) {
          void healSchedulePath(loaded.schedule.frequency, loaded.schedule.timeOfDay)
        }
        return loaded
      })
    }
    return this.localPromise
  }

  private async persistLocal() {
    if (!this.local) return
    try {
      await saveAppState(this.local)
    } catch (err) {
      console.error('Failed to persist app state:', err)
    }
  }

  private currentItems(): CleanupItem[] {
    if (!this.scan || !this.local) return []
    const exclusions = this.local.settings.exclusions
    return this.scan.items.map((item) =>
      isExcluded(item.path, exclusions) ? { ...item, excluded: true, selected: false } : { ...item, excluded: false },
    )
  }

  private currentCategories(): StorageCategory[] {
    if (!this.scan) return []
    return buildRealCategories(this.currentItems(), this.scan.applications, this.scan.overview.usedBytes)
  }

  private currentDiskSummary(): DiskSummary {
    if (!this.scan) {
      return { totalBytes: 0, usedBytes: 0, freeBytes: 0, purgeableBytes: null, reclaimableBytes: 0, lastScanAt: null }
    }
    return buildRealDiskSummary(
      this.currentCategories(),
      this.scan.overview.totalBytes,
      this.scan.overview.usedBytes,
      this.scan.overview.freeBytes,
      this.scan.overview.purgeableBytes,
      this.scan.diskSummary.lastScanAt,
    )
  }

  private snapshot(): ScanSnapshot | null {
    if (!this.scan) return null
    const cleanupItems = this.currentItems()
    return {
      scanSession: buildInitialScanSession(cleanupItems),
      diskSummary: this.currentDiskSummary(),
      categories: this.currentCategories(),
      cleanupItems,
      applications: this.scan.applications,
      browserProfiles: this.scan.browserProfiles,
      breakdown: this.scan.breakdown,
    }
  }

  async getOverview(): Promise<DiskSummary> {
    const overview = await getSystemOverview()
    this.homeDir = overview.homeDir
    if (this.scan) return this.currentDiskSummary()
    return overviewToSummary(overview)
  }

  async getLastScan(): Promise<ScanSnapshot | null> {
    await this.ensureLocal()
    return this.snapshot()
  }

  async runScan(onProgress?: (update: ScanProgressUpdate) => void): Promise<ScanSnapshot> {
    const local = await this.ensureLocal()

    // Concurrent callers (e.g. the quiet startup scan and a "Scan My Mac"
    // click) share one native scan instead of starting a second one.
    if (!this.scanPromise) {
      this.scanPromise = (async () => {
        const unlisten = onProgress
          ? await onScanProgress((event) => onProgress({ phase: event.phase, label: event.label }))
          : null
        try {
          const classified = classifyFullScan(await runFullScan())
          this.scan = classified
          this.homeDir = classified.overview.homeDir
          return classified
        } finally {
          unlisten?.()
          this.scanPromise = null
        }
      })()
    }
    await this.scanPromise

    const snapshot = this.snapshot()!
    // Recorded as a "manual" ScanEvent — same shape as a scheduled run's
    // record (see background.rs). A scan never touches history: nothing
    // was removed.
    const scanEvent: ScanEvent = {
      id: nextId('scan'),
      occurredAt: new Date().toISOString(),
      source: 'manual',
      foundBytes: snapshot.diskSummary.usedBytes,
      reclaimableBytes: snapshot.diskSummary.reclaimableBytes,
      freeBytes: snapshot.diskSummary.freeBytes,
      notificationSent: false,
    }
    local.scanEvents = [scanEvent, ...local.scanEvents].slice(0, 50)
    await this.persistLocal()
    return snapshot
  }

  /**
   * Real cleanup: moves each selected item to the macOS Trash via the native
   * `trash_items` command. Partial success is expected and handled: failed
   * items are reported back with a reason and are never removed from the
   * cached scan, so they remain visible to retry.
   */
  async cleanItems(ids: string[], _mode: CleanMode, onProgress?: (update: CleanupProgressUpdate) => void): Promise<CleanItemsResult> {
    const local = await this.ensureLocal()
    const idSet = new Set(ids)
    const targeted = this.currentItems().filter((item) => idSet.has(item.id) && !item.excluded)

    const unlisten = onProgress
      ? await onCleanupProgress((event) => onProgress(withProgressParams({ phase: event.phase, label: event.label })))
      : null

    let raw
    try {
      raw = await trashItems(
        targeted.map((item) => ({ id: item.id, name: itemName(item), path: item.path, sizeBytes: item.sizeBytes, safety: item.safety })),
      )
    } finally {
      unlisten?.()
    }

    const successIds: string[] = []
    const failures: CleanupFailure[] = []
    let movedToTrashBytes = 0
    const categoryTotals = new Map<string, number>()

    for (const result of raw.results) {
      const item = targeted.find((i) => i.id === result.id)
      if (result.success) {
        successIds.push(result.id)
        movedToTrashBytes += result.bytesProcessed
        if (item) categoryTotals.set(item.category, (categoryTotals.get(item.category) ?? 0) + result.bytesProcessed)
      } else {
        failures.push({ path: result.path, name: item?.name ?? result.path, reason: result.failureReason ?? 'Unknown error' })
      }
    }

    if (this.scan) {
      const successIdSet = new Set(successIds)
      this.scan = {
        ...this.scan,
        items: this.scan.items.filter((item) => !successIdSet.has(item.id)),
        overview: {
          ...this.scan.overview,
          totalBytes: raw.overviewAfter.totalBytes,
          usedBytes: raw.overviewAfter.usedBytes,
          freeBytes: raw.overviewAfter.freeBytes,
          purgeableBytes: raw.overviewAfter.purgeableBytes,
        },
      }
    }

    // Moving files to Trash on the same volume does not free disk space
    // until the Trash is emptied — this is the separate, honest "freed on
    // disk right now" figure.
    const freedOnDiskBytes = Math.max(0, raw.overviewBefore.usedBytes - raw.overviewAfter.usedBytes)

    const session: CleanupSession = {
      id: nextId('cleanup'),
      completedAt: new Date().toISOString(),
      source: 'manual',
      estimatedBytes: targeted.reduce((sum, item) => sum + item.sizeBytes, 0),
      actualBytes: movedToTrashBytes,
      itemIds: successIds,
      categoryBreakdown: Array.from(categoryTotals.entries()).map(([category, bytes]) => ({
        category: category as CleanupItem['category'],
        bytes,
      })),
      beforeUsedBytes: raw.overviewBefore.usedBytes,
      afterUsedBytes: raw.overviewAfter.usedBytes,
      itemCount: successIds.length,
      successCount: successIds.length,
      failureCount: failures.length,
      failures,
      freedOnDiskBytes,
    }

    local.history = [session, ...local.history].slice(0, 200)
    await this.persistLocal()

    return {
      session,
      diskSummary: this.currentDiskSummary(),
      categories: this.currentCategories(),
      remainingItems: this.currentItems(),
      successIds,
      failures,
    }
  }

  async trashTargets(targets: TrashTarget[]): Promise<TrashTargetsResult> {
    if (targets.length === 0) return { successPaths: [], failures: [], movedBytes: 0 }
    const raw = await trashItems(targets.map((t) => ({ id: t.id, name: t.name, path: t.path, sizeBytes: t.sizeBytes, safety: t.safety })))
    const successPaths: string[] = []
    const failures: CleanupFailure[] = []
    let movedBytes = 0
    for (const result of raw.results) {
      if (result.success) {
        successPaths.push(result.path)
        movedBytes += result.bytesProcessed
      } else {
        const target = targets.find((t) => t.id === result.id)
        failures.push({ path: result.path, name: target?.name ?? result.path, reason: result.failureReason ?? 'Unknown error' })
      }
    }
    return { successPaths, failures, movedBytes }
  }

  async excludeItem(id: string): Promise<CleanupItem[]> {
    const local = await this.ensureLocal()
    const target = this.currentItems().find((item) => item.id === id)
    if (target && !local.settings.exclusions.includes(target.path)) {
      local.settings = { ...local.settings, exclusions: [...local.settings.exclusions, target.path] }
      await this.persistLocal()
    }
    return this.currentItems()
  }

  async revealInFinder(path: string): Promise<void> {
    await revealInFinderNative(path)
  }

  async quickLook(path: string): Promise<void> {
    await bridgeQuickLook(path)
  }

  async getTrashInfo(): Promise<TrashInfo> {
    return bridgeGetTrashInfo()
  }

  async openTrash(): Promise<void> {
    await bridgeOpenTrash()
  }

  async getAppFootprint(app: ApplicationItem): Promise<AppFootprint> {
    const raw = await bridgeGetAppFootprint(app.path)
    return {
      ...raw,
      items: raw.items.map((item) => ({
        ...item,
        kind: item.kind as AppFootprint['items'][number]['kind'],
        safety: (item.safety === 'green' ? 'green' : 'orange') as SafetyLevel,
      })),
    }
  }

  async getAppIcon(app: ApplicationItem): Promise<string | null> {
    return bridgeGetAppIcon(app.path)
  }

  async uninstallApp(app: ApplicationItem): Promise<number> {
    const bytes = await bridgeUninstallApp(app.path)
    if (this.scan) {
      this.scan = { ...this.scan, applications: this.scan.applications.filter((a) => a.id !== app.id) }
    }
    return bytes
  }

  async getPermissions(): Promise<PermissionStatus[]> {
    if (!this.homeDir) this.homeDir = (await getSystemOverview()).homeDir
    const home = this.homeDir
    const [downloads, documents, safariCache] = await Promise.all([
      checkPathAccess(`${home}/Downloads`),
      checkPathAccess(`${home}/Documents`),
      checkPathAccess(`${home}/Library/Safari`),
    ])
    // ~/Library/Safari is only readable with Full Disk Access, which makes
    // it a reliable, side-effect-free probe for that permission.
    const fullDisk = safariCache.state === 'accessible'

    return [
      {
        category: 'full-disk-access',
        label: 'Full Disk Access',
        state: fullDisk ? 'granted' : 'denied',
        reason: 'Lets MacBook Cleaner measure caches, the Trash and app data that macOS otherwise hides.',
      },
      {
        category: 'downloads',
        label: 'Downloads Folder',
        state: mapAccessState(downloads.state),
        reason: 'Needed to find old installers, archives, and duplicate downloads.',
      },
      {
        category: 'documents',
        label: 'Documents Folder',
        state: mapAccessState(documents.state),
        reason: 'Needed to point out large or forgotten files for your review.',
      },
    ]
  }

  async requestPermission(category: PermissionStatus['category']): Promise<PermissionStatus[]> {
    if (category === 'full-disk-access' || category === 'browser-data') {
      await openFullDiskAccessSettings()
    }
    return this.getPermissions()
  }

  async getSchedule() {
    return (await this.ensureLocal()).schedule
  }

  /**
   * Installs/updates the native LaunchAgent when `rule.enabled`, or removes
   * it when disabled — see src-tauri/src/schedule.rs. `nextRunAt` always
   * reflects what the native side actually computed.
   */
  async saveSchedule(rule: ScheduleRule) {
    const local = await this.ensureLocal()
    let resolved: ScheduleRule
    if (rule.enabled) {
      const nextRunAt = await installSchedule(rule.frequency, rule.timeOfDay)
      resolved = { ...rule, nextRunAt }
    } else {
      await removeSchedule()
      resolved = { ...rule, nextRunAt: null }
    }
    local.schedule = resolved
    await this.persistLocal()
    return local.schedule
  }

  async getScheduleStatus(): Promise<boolean> {
    return bridgeGetScheduleStatus()
  }

  async getScanEvents(): Promise<ScanEvent[]> {
    return (await this.ensureLocal()).scanEvents
  }

  async getHistory() {
    return (await this.ensureLocal()).history
  }

  async getSettings() {
    return (await this.ensureLocal()).settings
  }

  async saveSettings(settings: Settings) {
    const local = await this.ensureLocal()
    if (!this.homeDir) this.homeDir = (await getSystemOverview()).homeDir
    local.settings = { ...settings, exclusions: normalizeExclusions(settings.exclusions, this.homeDir) }
    await this.persistLocal()
    return local.settings
  }

  async getLaunchAtLogin(): Promise<boolean> {
    return bridgeGetLaunchAtLogin()
  }

  async setLaunchAtLogin(enabled: boolean): Promise<boolean> {
    return bridgeSetLaunchAtLogin(enabled)
  }

  async getNotificationPermissionState(): Promise<PermissionState> {
    return mapNotificationPermission(await bridgeGetNotificationPermissionState())
  }

  /**
   * NOTE (verified upstream in the original app): tauri-plugin-notification
   * currently always reports "granted" on macOS desktop, so the UI pairs
   * this with an "Open Notification Settings" button rather than treating
   * the result as certain.
   */
  async requestNotificationPermission(): Promise<PermissionState> {
    return mapNotificationPermission(await bridgeRequestNotificationPermission())
  }

  async openNotificationSettings(): Promise<void> {
    await bridgeOpenNotificationSettings()
  }

  async resetAllData(): Promise<void> {
    await removeSchedule().catch(() => {})
    this.local = { settings: DEFAULT_SETTINGS, schedule: DEFAULT_SCHEDULE, history: [], scanEvents: [] }
    this.localPromise = Promise.resolve(this.local)
    this.scan = null
    await this.persistLocal()
  }
}

function mapAccessState(state: 'accessible' | 'denied' | 'not-found'): PermissionStatus['state'] {
  if (state === 'accessible') return 'granted'
  if (state === 'not-found') return 'not-requested'
  return 'denied'
}

export const tauriStorageService = new TauriStorageService()
