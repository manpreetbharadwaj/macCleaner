import { create } from 'zustand'
import { updateService } from './updateService'
import type { UpdateCheckStatus, UpdateInfo, UpdateInstallStatus } from './types'

interface UpdateStoreState {
  checkStatus: UpdateCheckStatus
  available: UpdateInfo | null
  checkError: string | null

  installStatus: UpdateInstallStatus
  downloadedBytes: number
  totalBytes: number | null
  installError: string | null

  checkForUpdates: () => Promise<void>
  /** Only called after the user confirms the dialog — see UpdateSection.tsx. */
  downloadAndInstall: () => Promise<void>
  restartApp: () => Promise<void>
  reset: () => void
}

export const useUpdateStore = create<UpdateStoreState>((set) => ({
  checkStatus: 'idle',
  available: null,
  checkError: null,

  installStatus: 'idle',
  downloadedBytes: 0,
  totalBytes: null,
  installError: null,

  checkForUpdates: async () => {
    set({ checkStatus: 'checking', checkError: null })
    try {
      const info = await updateService.check()
      set({ checkStatus: info ? 'available' : 'upToDate', available: info })
    } catch (err) {
      set({ checkStatus: 'error', checkError: err instanceof Error ? err.message : String(err) })
    }
  },

  downloadAndInstall: async () => {
    set({ installStatus: 'downloading', downloadedBytes: 0, totalBytes: null, installError: null })
    const unlisten = await updateService.onProgress((event) => {
      if (event.kind === 'progress') {
        set((s) => ({
          downloadedBytes: s.downloadedBytes + event.chunkLength,
          totalBytes: event.contentLength ?? s.totalBytes,
        }))
      }
    })
    try {
      await updateService.downloadAndInstall()
      set({ installStatus: 'readyToRestart' })
    } catch (err) {
      set({ installStatus: 'error', installError: err instanceof Error ? err.message : String(err) })
    } finally {
      unlisten()
    }
  },

  restartApp: () => updateService.restartApp(),

  reset: () => set({ checkStatus: 'idle', available: null, checkError: null, installStatus: 'idle', downloadedBytes: 0, totalBytes: null, installError: null }),
}))
