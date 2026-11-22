import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { isTauriRuntime } from '@/services/environment'
import type { UpdateInfo, UpdateProgressEvent } from './types'

export interface UpdateService {
  check(): Promise<UpdateInfo | null>
  downloadAndInstall(): Promise<void>
  onProgress(cb: (event: UpdateProgressEvent) => void): Promise<UnlistenFn>
  restartApp(): Promise<void>
}

const tauriUpdateService: UpdateService = {
  check: () => invoke('update_check'),
  downloadAndInstall: () => invoke('update_download_and_install'),
  onProgress: (cb) => listen<UpdateProgressEvent>('update://progress', (e) => cb(e.payload)),
  restartApp: () => invoke('update_restart_app'),
}

/** Browser preview (`npm run dev`) has no updater at all — always reports no update available. */
const mockUpdateService: UpdateService = {
  check: async () => null,
  downloadAndInstall: async () => {},
  onProgress: async () => () => {},
  restartApp: async () => {},
}

export const updateService: UpdateService = isTauriRuntime() ? tauriUpdateService : mockUpdateService
