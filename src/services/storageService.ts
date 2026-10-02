import { isTauriRuntime } from './environment'
import { mockStorageService } from './mockStorageService'
import { tauriStorageService } from './tauriStorageService'

export type { CleanItemsResult, CleanMode, ScanSnapshot, StorageService } from './storageServiceTypes'

/**
 * Selects the real implementation when running inside the Tauri desktop
 * shell, or the sample-data preview in a plain browser. Every screen and the
 * Zustand store depend only on this — never on Mock/Tauri directly.
 */
export const storageService = isTauriRuntime() ? tauriStorageService : mockStorageService
