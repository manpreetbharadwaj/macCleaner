import { create } from 'zustand'
import { licenseService } from './licenseService'
import { translateNativeMessage } from '@/i18n/nativeText'
import type { LicenseState } from './types'

interface LicenseStoreState {
  state: LicenseState | null
  activating: boolean
  deactivating: boolean
  refreshing: boolean

  init: () => Promise<void>
  refresh: () => Promise<void>
  activate: (licenseKey: string) => Promise<{ ok: true } | { ok: false; error: string }>
  deactivate: () => Promise<{ ok: true } | { ok: false; error: string }>
  openPurchasePage: () => Promise<void>
}

function errorMessage(err: unknown): string {
  if (typeof err === 'string') return translateNativeMessage(err)
  if (err instanceof Error) return translateNativeMessage(err.message)
  return String(err)
}

export const useLicenseStore = create<LicenseStoreState>((set, get) => ({
  state: null,
  activating: false,
  deactivating: false,
  refreshing: false,

  init: async () => {
    // Local/instant first, so the gate never flashes "locked" while the
    // (possibly slow, possibly offline) network refresh is still pending.
    set({ state: await licenseService.getState() })
    void get().refresh()
  },

  refresh: async () => {
    set({ refreshing: true })
    try {
      set({ state: await licenseService.refresh() })
    } finally {
      set({ refreshing: false })
    }
  },

  activate: async (licenseKey) => {
    set({ activating: true })
    try {
      set({ state: await licenseService.activate(licenseKey) })
      return { ok: true }
    } catch (err) {
      return { ok: false, error: errorMessage(err) }
    } finally {
      set({ activating: false })
    }
  },

  deactivate: async () => {
    set({ deactivating: true })
    try {
      set({ state: await licenseService.deactivate() })
      return { ok: true }
    } catch (err) {
      return { ok: false, error: errorMessage(err) }
    } finally {
      set({ deactivating: false })
    }
  },

  openPurchasePage: () => licenseService.openPurchasePage(),
}))
