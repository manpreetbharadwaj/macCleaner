import { create } from 'zustand'
import type {
  AppFootprint,
  ApplicationItem,
  BrowserProfile,
  CleanupFailure,
  CleanupItem,
  CleanupSession,
  DiskSummary,
  PermissionState,
  PermissionStatus,
  ScanEvent,
  ScanSession,
  ScheduleRule,
  Settings,
  StorageBreakdownEntry,
  StorageCategory,
  TrashInfo,
  TrashTarget,
} from '@/types'
import { storageService } from '@/services/storageService'
import type { CleanupProgressUpdate, ScanProgressUpdate, ScanSnapshot } from '@/services/storageServiceTypes'
import { dataSource, type DataSource } from '@/services/environment'
import { applyLanguage, i18n } from '@/i18n'
import { getSystemLocales, syncNativeLanguage } from '@/i18n/system'
import { translateNativeMessage } from '@/i18n/nativeText'

export interface Toast {
  id: string
  message: string
  tone: 'default' | 'success' | 'warning'
}

/** What a finished cleanup reports back to the completion screen. */
export interface CleanupOutcome {
  movedBytes: number
  successCount: number
  failures: CleanupFailure[]
}

interface AppState {
  ready: boolean
  dataSource: DataSource
  diskSummary: DiskSummary | null
  /** True once at least one scan has completed in this session. */
  hasScanned: boolean
  scanSession: ScanSession | null
  categories: StorageCategory[]
  cleanupItems: CleanupItem[]
  applications: ApplicationItem[]
  browserProfiles: BrowserProfile[]
  breakdown: StorageBreakdownEntry[]
  trashInfo: TrashInfo | null
  permissions: PermissionStatus[]
  schedule: ScheduleRule | null
  scheduleInstalled: boolean
  scanEvents: ScanEvent[]
  notificationPermission: PermissionState
  settings: Settings | null
  launchAtLogin: boolean
  history: CleanupSession[]
  scanning: boolean
  scanProgress: ScanProgressUpdate | null
  cleaning: boolean
  toasts: Toast[]
  appIcons: Record<string, string | null>
  footprints: Record<string, AppFootprint>

  init: () => Promise<void>
  runScan: () => Promise<boolean>
  cleanItems: (ids: string[], onProgress?: (update: CleanupProgressUpdate) => void) => Promise<CleanupOutcome>
  trashTargets: (targets: TrashTarget[]) => Promise<CleanupOutcome>
  excludeItem: (id: string) => Promise<void>
  revealInFinder: (path: string) => Promise<void>
  quickLook: (path: string) => Promise<void>
  refreshTrashInfo: () => Promise<void>
  openTrash: () => Promise<void>
  loadAppIcon: (app: ApplicationItem) => Promise<void>
  loadAppFootprint: (app: ApplicationItem, force?: boolean) => Promise<AppFootprint | null>
  uninstallApp: (app: ApplicationItem, leftovers: TrashTarget[]) => Promise<CleanupOutcome>
  saveSchedule: (rule: ScheduleRule) => Promise<void>
  updateSettings: (patch: Partial<Settings>) => Promise<void>
  setLaunchAtLogin: (enabled: boolean) => Promise<void>
  refreshPermissions: () => Promise<void>
  requestPermission: (category: PermissionStatus['category']) => Promise<void>
  requestNotificationPermission: () => Promise<void>
  openNotificationSettings: () => Promise<void>
  completeOnboarding: () => Promise<void>
  resetAllData: () => Promise<void>
  /** Re-reads the Mac's language when following the system (e.g. after the window regains focus). */
  refreshSystemLanguage: () => Promise<void>
  pushToast: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: string) => void
}

let toastCounter = 0

/** Native (Rust) errors are fixed English strings — show them in the app's language. */
function errorMessage(err: unknown): string {
  if (typeof err === 'string') return translateNativeMessage(err)
  if (err instanceof Error) return translateNativeMessage(err.message)
  return i18n.t('errors.generic')
}

/** Resolves and applies the UI language, then tells the native side (menu bar). */
async function applyLanguagePreference(preference: string | undefined): Promise<void> {
  const code = await applyLanguage(preference, await getSystemLocales())
  void syncNativeLanguage(code)
}

function applySnapshot(snapshot: ScanSnapshot): Partial<AppState> {
  return {
    hasScanned: true,
    scanSession: snapshot.scanSession,
    diskSummary: snapshot.diskSummary,
    categories: snapshot.categories,
    cleanupItems: snapshot.cleanupItems,
    applications: snapshot.applications,
    browserProfiles: snapshot.browserProfiles,
    breakdown: snapshot.breakdown,
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  dataSource,
  diskSummary: null,
  hasScanned: false,
  scanSession: null,
  categories: [],
  cleanupItems: [],
  applications: [],
  browserProfiles: [],
  breakdown: [],
  trashInfo: null,
  permissions: [],
  schedule: null,
  scheduleInstalled: false,
  scanEvents: [],
  notificationPermission: 'not-requested',
  settings: null,
  launchAtLogin: false,
  history: [],
  scanning: false,
  scanProgress: null,
  cleaning: false,
  toasts: [],
  appIcons: {},
  footprints: {},

  init: async () => {
    // Deliberately no disk scan here: launch only reads the volume overview
    // and saved state, so the window is interactive immediately. Scanning
    // happens on request ("Scan My Mac") or quietly once onboarding is done.
    const [diskSummary, settings, schedule, history, scanEvents, lastScan, scheduleInstalled, notificationPermission, launchAtLogin] =
      await Promise.all([
        storageService.getOverview(),
        storageService.getSettings(),
        storageService.getSchedule(),
        storageService.getHistory(),
        storageService.getScanEvents(),
        storageService.getLastScan(),
        storageService.getScheduleStatus().catch(() => false),
        storageService.getNotificationPermissionState().catch(() => 'not-requested' as PermissionState),
        storageService.getLaunchAtLogin().catch(() => false),
      ])
    // Before the first paint, so the window never flashes English.
    await applyLanguagePreference(settings.language)
    set({
      diskSummary,
      settings,
      schedule,
      history,
      scanEvents,
      scheduleInstalled,
      notificationPermission,
      launchAtLogin,
      ...(lastScan ? applySnapshot(lastScan) : {}),
      ready: true,
    })
    void get().refreshTrashInfo()
    void get().refreshPermissions()
    if (settings.onboardingCompleted && !lastScan) void get().runScan()
  },

  runScan: async () => {
    if (get().scanning) {
      // Already running (e.g. the quiet startup scan) — wait for it.
      await new Promise<void>((resolve) => {
        const unsubscribe = useAppStore.subscribe((s) => {
          if (!s.scanning) {
            unsubscribe()
            resolve()
          }
        })
      })
      return get().hasScanned
    }
    set({ scanning: true, scanProgress: { phase: 'overview', label: 'Analyzing storage…' } })
    try {
      const snapshot = await storageService.runScan((update) => set({ scanProgress: update }))
      set({ ...applySnapshot(snapshot), appIcons: get().appIcons, footprints: {} })
      void get().refreshTrashInfo()
      set({ scanEvents: await storageService.getScanEvents() })
      return true
    } catch (err) {
      console.error('Scan failed:', err)
      get().pushToast(i18n.t('toasts.scanFailed', { error: errorMessage(err) }), 'warning')
      return false
    } finally {
      set({ scanning: false, scanProgress: null })
    }
  },

  cleanItems: async (ids, onProgress) => {
    if (ids.length === 0) return { movedBytes: 0, successCount: 0, failures: [] }
    set({ cleaning: true })
    try {
      const result = await storageService.cleanItems(ids, 'trash', onProgress)
      const failures = result.failures ?? []
      set({
        cleanupItems: result.remainingItems,
        diskSummary: result.diskSummary,
        categories: result.categories,
        history: [result.session, ...get().history],
      })
      void get().refreshTrashInfo()
      return { movedBytes: result.session.actualBytes, successCount: result.session.successCount ?? result.session.itemCount, failures }
    } finally {
      set({ cleaning: false })
    }
  },

  trashTargets: async (targets) => {
    set({ cleaning: true })
    try {
      const result = await storageService.trashTargets(targets)
      void get().refreshTrashInfo()
      return { movedBytes: result.movedBytes, successCount: result.successPaths.length, failures: result.failures }
    } finally {
      set({ cleaning: false })
    }
  },

  excludeItem: async (id) => {
    const cleanupItems = await storageService.excludeItem(id)
    const settings = await storageService.getSettings()
    set({ cleanupItems, settings })
    get().pushToast(i18n.t('toasts.excluded'), 'default')
  },

  revealInFinder: async (path) => {
    try {
      await storageService.revealInFinder(path)
    } catch (err) {
      get().pushToast(i18n.t('toasts.revealFailed', { error: errorMessage(err) }), 'warning')
    }
  },

  quickLook: async (path) => {
    try {
      await storageService.quickLook(path)
      if (get().dataSource === 'mock') get().pushToast(i18n.t('toasts.quickLookPreview'), 'default')
    } catch (err) {
      get().pushToast(i18n.t('toasts.previewFailed', { error: errorMessage(err) }), 'warning')
    }
  },

  refreshTrashInfo: async () => {
    try {
      set({ trashInfo: await storageService.getTrashInfo() })
    } catch {
      set({ trashInfo: { sizeBytes: null, itemCount: null } })
    }
  },

  openTrash: async () => {
    await storageService.openTrash()
  },

  loadAppIcon: async (app) => {
    if (app.path in get().appIcons) return
    set({ appIcons: { ...get().appIcons, [app.path]: null } })
    try {
      const icon = await storageService.getAppIcon(app)
      set({ appIcons: { ...get().appIcons, [app.path]: icon } })
    } catch {
      // monogram fallback stays in place
    }
  },

  loadAppFootprint: async (app, force = false) => {
    const cached = get().footprints[app.path]
    if (cached && !force) return cached
    try {
      const footprint = await storageService.getAppFootprint(app)
      set({ footprints: { ...get().footprints, [app.path]: footprint } })
      return footprint
    } catch (err) {
      console.error('Footprint failed:', err)
      return null
    }
  },

  uninstallApp: async (app, leftovers) => {
    set({ cleaning: true })
    try {
      const appBytes = await storageService.uninstallApp(app)
      const leftoverResult = await storageService.trashTargets(leftovers)
      const footprints = { ...get().footprints }
      delete footprints[app.path]
      set({ applications: get().applications.filter((a) => a.id !== app.id), footprints })
      void get().refreshTrashInfo()
      return {
        movedBytes: appBytes + leftoverResult.movedBytes,
        successCount: 1 + leftoverResult.successPaths.length,
        failures: leftoverResult.failures,
      }
    } finally {
      set({ cleaning: false })
    }
  },

  saveSchedule: async (rule) => {
    try {
      const schedule = await storageService.saveSchedule(rule)
      const scheduleInstalled = await storageService.getScheduleStatus()
      set({ schedule, scheduleInstalled })
      get().pushToast(schedule.enabled ? i18n.t('toasts.scheduleSaved') : i18n.t('toasts.scheduleOff'), 'success')
    } catch (err) {
      get().pushToast(errorMessage(err), 'warning')
    }
  },

  refreshSystemLanguage: async () => {
    const settings = get().settings
    if (settings && (settings.language ?? 'system') === 'system') await applyLanguagePreference('system')
  },

  updateSettings: async (patch) => {
    const current = get().settings
    if (!current) return
    const optimistic = { ...current, ...patch }
    set({ settings: optimistic })
    // Switch language immediately — no restart, and before the save round-trip.
    if ('language' in patch) void applyLanguagePreference(optimistic.language)
    const saved = await storageService.saveSettings(optimistic)
    set({ settings: saved })
    // Exclusions live inside settings — re-derive items so a change applies without a rescan.
    if ('exclusions' in patch && get().hasScanned) {
      const snapshot = await storageService.getLastScan()
      if (snapshot) set(applySnapshot(snapshot))
    }
  },

  setLaunchAtLogin: async (enabled) => {
    try {
      set({ launchAtLogin: await storageService.setLaunchAtLogin(enabled) })
    } catch (err) {
      get().pushToast(errorMessage(err), 'warning')
    }
  },

  refreshPermissions: async () => {
    try {
      set({ permissions: await storageService.getPermissions() })
    } catch {
      // non-fatal
    }
  },

  requestPermission: async (category) => {
    set({ permissions: await storageService.requestPermission(category) })
  },

  requestNotificationPermission: async () => {
    set({ notificationPermission: await storageService.requestNotificationPermission() })
  },

  openNotificationSettings: async () => {
    await storageService.openNotificationSettings()
  },

  completeOnboarding: async () => {
    await get().updateSettings({ onboardingCompleted: true })
  },

  resetAllData: async () => {
    await storageService.resetAllData()
    set({ hasScanned: false, cleanupItems: [], applications: [], breakdown: [], categories: [], footprints: {} })
    await get().init()
  },

  pushToast: (message, tone = 'default') => {
    toastCounter += 1
    const id = `toast-${toastCounter}`
    set({ toasts: [...get().toasts, { id, message, tone }] })
    setTimeout(() => get().dismissToast(id), 4200)
  },

  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))
