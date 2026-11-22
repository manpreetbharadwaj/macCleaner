/** Mirrors src-tauri/src/update.rs's `UpdateInfoDto`. */
export interface UpdateInfo {
  version: string
  currentVersion: string
  notes: string | null
  date: string | null
}

/** Mirrors src-tauri/src/update.rs's `UpdateProgressEvent`. */
export type UpdateProgressEvent = { kind: 'progress'; chunkLength: number; contentLength: number | null } | { kind: 'finished' }

export type UpdateCheckStatus = 'idle' | 'checking' | 'upToDate' | 'available' | 'error'
export type UpdateInstallStatus = 'idle' | 'downloading' | 'readyToRestart' | 'error'
