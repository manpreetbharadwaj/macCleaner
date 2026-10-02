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
  TrashTargetsResult,
} from '@/types'

export type CleanMode = 'trash' | 'permanent'

/** Shared shape for both the scan and cleanup progress event channels. */
export interface ProgressUpdate {
  phase: string
  /** English label from the native side — only a fallback; the UI translates by `phase`. */
  label: string
  /** Values for the translated label, e.g. { index, total, name } while moving items. */
  params?: Record<string, string | number>
}

/** Stable key, e.g. "overview" | "developer" | "browsers" | "applications" | "files" | "finalizing". */
export type ScanProgressUpdate = ProgressUpdate
/** Stable key, e.g. "preparing" | "moving" | "verifying" | "done". */
export type CleanupProgressUpdate = ProgressUpdate

/** Everything a completed scan produces, in one snapshot. */
export interface ScanSnapshot {
  scanSession: ScanSession
  diskSummary: DiskSummary
  categories: StorageCategory[]
  cleanupItems: CleanupItem[]
  applications: ApplicationItem[]
  browserProfiles: BrowserProfile[]
  breakdown: StorageBreakdownEntry[]
}

export interface CleanItemsResult {
  session: CleanupSession
  diskSummary: DiskSummary
  categories: StorageCategory[]
  remainingItems: CleanupItem[]
  /**
   * Real-cleanup-only (undefined in mock mode, where every item always
   * succeeds). When present, only `successIds` were actually moved —
   * `failures` stay visible so the user can see and retry them.
   */
  successIds?: string[]
  failures?: CleanupFailure[]
}

/**
 * Abstract contract for all system-like data. Two implementations exist:
 * MockStorageService (browser preview, sample data) and TauriStorageService
 * (real macOS data via Tauri commands). The UI and Zustand store only ever
 * depend on this interface — see services/storageService.ts for selection.
 */
export interface StorageService {
  /** Fast (no scan): total/used/free straight from the volume. */
  getOverview(): Promise<DiskSummary>
  /** The most recent scan in this session, or null if none has run yet. */
  getLastScan(): Promise<ScanSnapshot | null>
  runScan(onProgress?: (update: ScanProgressUpdate) => void): Promise<ScanSnapshot>

  /**
   * Moves the given scanned items to the Trash. Never permanently deletes —
   * `mode` exists for interface compatibility only.
   */
  cleanItems(
    ids: string[],
    mode: CleanMode,
    onProgress?: (update: CleanupProgressUpdate) => void,
  ): Promise<CleanItemsResult>
  /** Moves arbitrary non-scanned paths (e.g. an app's leftover files) to the Trash, through the same native safety checks. */
  trashTargets(targets: TrashTarget[]): Promise<TrashTargetsResult>
  excludeItem(id: string): Promise<CleanupItem[]>

  revealInFinder(path: string): Promise<void>
  quickLook(path: string): Promise<void>
  getTrashInfo(): Promise<TrashInfo>
  openTrash(): Promise<void>

  getAppFootprint(app: ApplicationItem): Promise<AppFootprint>
  getAppIcon(app: ApplicationItem): Promise<string | null>
  /** Moves the .app bundle to the Trash (validated natively). Resolves to the bytes moved. */
  uninstallApp(app: ApplicationItem): Promise<number>

  getPermissions(): Promise<PermissionStatus[]>
  requestPermission(category: PermissionStatus['category']): Promise<PermissionStatus[]>

  getSchedule(): Promise<ScheduleRule>
  /**
   * Saving an enabled schedule installs/updates the native background
   * scheduler (a launchd LaunchAgent — see src-tauri/src/schedule.rs);
   * saving a disabled one removes it.
   */
  saveSchedule(rule: ScheduleRule): Promise<ScheduleRule>
  getScheduleStatus(): Promise<boolean>
  getScanEvents(): Promise<ScanEvent[]>
  getHistory(): Promise<CleanupSession[]>

  getSettings(): Promise<Settings>
  saveSettings(settings: Settings): Promise<Settings>
  getLaunchAtLogin(): Promise<boolean>
  setLaunchAtLogin(enabled: boolean): Promise<boolean>

  getNotificationPermissionState(): Promise<PermissionState>
  requestNotificationPermission(): Promise<PermissionState>
  openNotificationSettings(): Promise<void>

  resetAllData(): Promise<void>
}
