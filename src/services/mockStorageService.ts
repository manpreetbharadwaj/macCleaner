import type {
  AppFootprint,
  AppFootprintItem,
  ApplicationItem,
  CleanupItem,
  CleanupSession,
  DiskSummary,
  PermissionState,
  PermissionStatus,
  ScanEvent,
  ScheduleRule,
  Settings,
  TrashInfo,
  TrashTarget,
  TrashTargetsResult,
} from '@/types'
import { buildInitialScanSession } from '@/mocks'
import { buildSampleScan, SAMPLE_HOME } from '@/mocks/rawSample'
import { GB, MB, nextId } from '@/mocks/seed'
import { buildRealCategories, buildRealDiskSummary, classifyFullScan, type ClassifiedScan } from './tauri/classify'
import { DEFAULT_SCHEDULE, DEFAULT_SETTINGS } from './defaults'
import type { CleanItemsResult, ScanProgressUpdate, ScanSnapshot, StorageService } from './storageServiceTypes'
import { isExcluded, normalizeExclusions } from '@/lib/exclusions'
import { itemName } from '@/i18n/items'

const STORAGE_KEY = 'macbook-cleaner:preview:v1'

interface PersistedPreview {
  settings: Settings
  schedule: ScheduleRule
  history: CleanupSession[]
  scanEvents: ScanEvent[]
  launchAtLogin: boolean
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function loadPersisted(): PersistedPreview {
  const fresh: PersistedPreview = { settings: DEFAULT_SETTINGS, schedule: DEFAULT_SCHEDULE, history: [], scanEvents: [], launchAtLogin: false }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fresh
    const parsed = JSON.parse(raw) as Partial<PersistedPreview>
    return {
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      schedule: { ...DEFAULT_SCHEDULE, ...parsed.schedule },
      history: parsed.history ?? [],
      scanEvents: parsed.scanEvents ?? [],
      launchAtLogin: parsed.launchAtLogin ?? false,
    }
  } catch {
    return fresh
  }
}

/** Scan phases mirrored from src-tauri/src/commands.rs::run_full_scan, so the preview's scan animation is driven the same way. */
const PREVIEW_PHASES: [phase: string, label: string, ms: number][] = [
  ['overview', 'Analyzing storage…', 700],
  ['developer', 'Scanning developer tooling…', 900],
  ['browsers', 'Scanning browser caches…', 700],
  ['applications', 'Scanning installed applications…', 900],
  ['files', 'Scanning Downloads, Desktop & Documents…', 1100],
  ['finalizing', 'Calculating reclaimable storage…', 600],
]

/**
 * Browser-preview implementation. Runs a realistic raw sample (see
 * mocks/rawSample.ts) through the real classifier, then simulates moving
 * items to the Trash in memory. Nothing on disk is ever read or changed.
 */
export class MockStorageService implements StorageService {
  private state: PersistedPreview = loadPersisted()
  private removedPaths = new Set<string>()
  private scan: ClassifiedScan | null = null
  private trashBytes = 820 * MB

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state))
    } catch {
      // localStorage unavailable — preview continues without persistence
    }
  }

  private items(): CleanupItem[] {
    if (!this.scan) return []
    const exclusions = this.state.settings.exclusions
    return this.scan.items
      .filter((item) => !this.removedPaths.has(item.path))
      .map((item) => (isExcluded(item.path, exclusions) ? { ...item, excluded: true } : { ...item, excluded: false }))
  }

  private rebuild() {
    this.scan = classifyFullScan(buildSampleScan(this.removedPaths))
  }

  private snapshot(): ScanSnapshot | null {
    if (!this.scan) return null
    const cleanupItems = this.items()
    const categories = buildRealCategories(cleanupItems, this.scan.applications, this.scan.overview.usedBytes)
    const o = this.scan.overview
    return {
      scanSession: buildInitialScanSession(cleanupItems),
      diskSummary: buildRealDiskSummary(categories, o.totalBytes, o.usedBytes, o.freeBytes, o.purgeableBytes, this.scan.diskSummary.lastScanAt),
      categories,
      cleanupItems,
      applications: this.scan.applications,
      browserProfiles: this.scan.browserProfiles,
      breakdown: this.scan.breakdown,
    }
  }

  async getOverview(): Promise<DiskSummary> {
    await delay(80)
    const snap = this.snapshot()
    if (snap) return snap.diskSummary
    const o = buildSampleScan(this.removedPaths).overview
    return { totalBytes: o.totalBytes, usedBytes: o.usedBytes, freeBytes: o.freeBytes, purgeableBytes: o.purgeableBytes, reclaimableBytes: 0, lastScanAt: null }
  }

  async getLastScan(): Promise<ScanSnapshot | null> {
    return this.snapshot()
  }

  async runScan(onProgress?: (update: ScanProgressUpdate) => void): Promise<ScanSnapshot> {
    for (const [phase, label, ms] of PREVIEW_PHASES) {
      onProgress?.({ phase, label })
      await delay(ms)
    }
    this.rebuild()
    const snap = this.snapshot()!
    this.state.scanEvents = [
      {
        id: nextId('scan'),
        occurredAt: new Date().toISOString(),
        source: 'manual' as const,
        foundBytes: snap.diskSummary.usedBytes,
        reclaimableBytes: snap.diskSummary.reclaimableBytes,
        freeBytes: snap.diskSummary.freeBytes,
        notificationSent: false,
      },
      ...this.state.scanEvents,
    ].slice(0, 50)
    this.persist()
    return snap
  }

  async cleanItems(ids: string[], _mode: unknown, onProgress?: (update: ScanProgressUpdate) => void): Promise<CleanItemsResult> {
    const idSet = new Set(ids)
    const targeted = this.items().filter((item) => idSet.has(item.id) && !item.excluded)
    const before = this.snapshot()!.diskSummary.usedBytes
    onProgress?.({ phase: 'preparing', label: 'Preparing cleanup…' })
    await delay(400)
    const successIds: string[] = []
    const failures: CleanItemsResult['failures'] = []
    for (const [index, item] of targeted.entries()) {
      onProgress?.({ phase: 'moving', label: `Processing ${index + 1} of ${targeted.length}: ${item.name}`, params: { index: index + 1, total: targeted.length, name: itemName(item) } })
      await delay(Math.min(220, 1600 / Math.max(1, targeted.length)))
      // Mirrors the native layer: protected items and paths outside the home folder are always refused.
      if (item.safety === 'red' || !item.path.startsWith(SAMPLE_HOME)) {
        failures.push({ path: item.path, name: item.name, reason: 'Refusing to trash a path outside the user\'s home directory' })
        continue
      }
      successIds.push(item.id)
      this.removedPaths.add(item.path)
    }
    onProgress?.({ phase: 'verifying', label: 'Verifying results…' })
    await delay(300)

    const moved = targeted.filter((i) => successIds.includes(i.id))
    const movedBytes = moved.reduce((s, i) => s + i.sizeBytes, 0)
    this.trashBytes += movedBytes
    this.rebuild()
    const snap = this.snapshot()!

    const breakdown = new Map<string, number>()
    for (const item of moved) breakdown.set(item.category, (breakdown.get(item.category) ?? 0) + item.sizeBytes)
    const session: CleanupSession = {
      id: nextId('cleanup'),
      completedAt: new Date().toISOString(),
      source: 'manual',
      estimatedBytes: targeted.reduce((s, i) => s + i.sizeBytes, 0),
      actualBytes: movedBytes,
      itemIds: successIds,
      categoryBreakdown: [...breakdown.entries()].map(([category, bytes]) => ({ category: category as CleanupItem['category'], bytes })),
      beforeUsedBytes: before,
      afterUsedBytes: snap.diskSummary.usedBytes,
      itemCount: successIds.length,
      successCount: successIds.length,
      failureCount: failures.length,
      failures,
      freedOnDiskBytes: 0,
    }
    this.state.history = [session, ...this.state.history].slice(0, 200)
    this.persist()
    return { session, diskSummary: snap.diskSummary, categories: snap.categories, remainingItems: snap.cleanupItems, successIds, failures }
  }

  async trashTargets(targets: TrashTarget[]): Promise<TrashTargetsResult> {
    await delay(500)
    for (const t of targets) this.removedPaths.add(t.path)
    const movedBytes = targets.reduce((s, t) => s + t.sizeBytes, 0)
    this.trashBytes += movedBytes
    return { successPaths: targets.map((t) => t.path), failures: [], movedBytes }
  }

  async excludeItem(id: string): Promise<CleanupItem[]> {
    const target = this.items().find((item) => item.id === id)
    if (target && !this.state.settings.exclusions.includes(target.path)) {
      this.state.settings = { ...this.state.settings, exclusions: [...this.state.settings.exclusions, target.path] }
      this.persist()
    }
    return this.items()
  }

  async revealInFinder(): Promise<void> {
    await delay(80)
  }

  async quickLook(): Promise<void> {
    await delay(80)
  }

  async getTrashInfo(): Promise<TrashInfo> {
    await delay(60)
    return { sizeBytes: this.trashBytes, itemCount: 14 }
  }

  async openTrash(): Promise<void> {
    await delay(60)
  }

  async getAppFootprint(app: ApplicationItem): Promise<AppFootprint> {
    await delay(250 + Math.random() * 300)
    // Deterministic, plausible numbers per app (seeded by its name).
    let seed = 0
    for (const ch of app.name) seed = (seed * 33 + ch.charCodeAt(0)) >>> 0
    const r = (n: number) => ((seed = (seed * 1103515245 + 12345) >>> 0) % 1000) / 1000 * n
    const id = app.bundleId ?? app.name
    const lib = `${SAMPLE_HOME}/Library`
    const candidates: AppFootprintItem[] = [
      { kind: 'cache', label: 'Cache', path: `${lib}/Caches/${id}`, sizeBytes: Math.round(r(1.4 * GB)), safety: 'green' },
      { kind: 'support', label: 'Supporting files', path: `${lib}/Application Support/${app.name}`, sizeBytes: Math.round(r(700 * MB)), safety: 'orange' },
      { kind: 'logs', label: 'Logs', path: `${lib}/Logs/${app.name}`, sizeBytes: Math.round(r(60 * MB)), safety: 'green' },
      { kind: 'preferences', label: 'Preferences', path: `${lib}/Preferences/${id}.plist`, sizeBytes: Math.round(r(400_000)) + 4000, safety: 'orange' },
      { kind: 'saved-state', label: 'Saved window state', path: `${lib}/Saved Application State/${id}.savedState`, sizeBytes: Math.round(r(3 * MB)), safety: 'green' },
    ]
    const items = candidates.filter((c) => c.sizeBytes > 50_000 && !this.removedPaths.has(c.path)).sort((a, b) => b.sizeBytes - a.sizeBytes)
    return {
      appPath: app.path,
      appBytes: app.sizeBytes,
      bundleId: app.bundleId,
      isSystemApp: (app.bundleId ?? '').toLowerCase().startsWith('com.apple.'),
      items,
    }
  }

  async getAppIcon(): Promise<string | null> {
    return null
  }

  async uninstallApp(app: ApplicationItem): Promise<number> {
    await delay(700)
    if ((app.bundleId ?? '').toLowerCase().startsWith('com.apple.')) {
      throw new Error('Apple apps are part of macOS and are protected')
    }
    this.removedPaths.add(app.path)
    this.trashBytes += app.sizeBytes
    this.rebuild()
    return app.sizeBytes
  }

  async getPermissions(): Promise<PermissionStatus[]> {
    await delay(80)
    return [
      { category: 'full-disk-access', label: 'Full Disk Access', state: 'denied', reason: 'Lets MacBook Cleaner measure caches, the Trash and app data that macOS otherwise hides.' },
      { category: 'downloads', label: 'Downloads Folder', state: 'granted', reason: 'Needed to find old installers, archives, and duplicate downloads.' },
      { category: 'documents', label: 'Documents Folder', state: 'granted', reason: 'Needed to point out large or forgotten files for your review.' },
    ]
  }

  async requestPermission(): Promise<PermissionStatus[]> {
    return this.getPermissions()
  }

  async getSchedule(): Promise<ScheduleRule> {
    return this.state.schedule
  }

  async saveSchedule(rule: ScheduleRule): Promise<ScheduleRule> {
    await delay(250)
    const next = new Date()
    const [h, m] = rule.timeOfDay.split(':').map(Number)
    next.setHours(h, m, 0, 0)
    const days = rule.frequency === 'daily' ? 1 : rule.frequency === 'weekly' ? 7 : rule.frequency === 'biweekly' ? 14 : 30
    if (next <= new Date()) next.setDate(next.getDate() + days)
    this.state.schedule = rule.enabled ? { ...rule, nextRunAt: next.toISOString() } : { ...rule, nextRunAt: null }
    this.persist()
    return this.state.schedule
  }

  async getScheduleStatus(): Promise<boolean> {
    return this.state.schedule.enabled
  }

  async getScanEvents(): Promise<ScanEvent[]> {
    return this.state.scanEvents
  }

  async getHistory(): Promise<CleanupSession[]> {
    return this.state.history
  }

  async getSettings(): Promise<Settings> {
    return this.state.settings
  }

  async saveSettings(settings: Settings): Promise<Settings> {
    this.state.settings = { ...settings, exclusions: normalizeExclusions(settings.exclusions, SAMPLE_HOME) }
    this.persist()
    return this.state.settings
  }

  async getLaunchAtLogin(): Promise<boolean> {
    return this.state.launchAtLogin
  }

  async setLaunchAtLogin(enabled: boolean): Promise<boolean> {
    this.state.launchAtLogin = enabled
    this.persist()
    return enabled
  }

  async getNotificationPermissionState(): Promise<PermissionState> {
    return this.state.settings.notificationsEnabled ? 'granted' : 'not-requested'
  }

  async requestNotificationPermission(): Promise<PermissionState> {
    return this.getNotificationPermissionState()
  }

  async openNotificationSettings(): Promise<void> {}

  async resetAllData(): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    this.state = loadPersisted()
    this.removedPaths.clear()
    this.scan = null
  }
}

export const mockStorageService = new MockStorageService()
