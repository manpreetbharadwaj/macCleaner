import { create } from 'zustand'
import { performanceService } from './performanceService'
import type { BatteryInfo, HistoryPoint, LiveMetrics, ProcessList, SystemInfo, UpdateStatus } from './types'

/** Session-only history for the live charts — never persisted. */
export const HISTORY_WINDOW_MS = 60_000

export type PerformanceTab = 'overview' | 'apps' | 'battery' | 'mac'

interface PerformanceState {
  tab: PerformanceTab
  systemInfo: SystemInfo | null
  live: LiveMetrics | null
  history: HistoryPoint[]
  processes: ProcessList | null
  includeSystem: boolean
  /** undefined = not loaded yet, null = this Mac has no battery. */
  battery: BatteryInfo | null | undefined
  updateStatus: UpdateStatus | null
  icons: Record<string, string | null>
  error: string | null

  setTab: (tab: PerformanceTab) => void
  setIncludeSystem: (on: boolean) => void
  loadSystemInfo: () => Promise<void>
  refreshLive: () => Promise<void>
  refreshProcesses: () => Promise<void>
  refreshBattery: (refreshHealth?: boolean) => Promise<void>
  refreshUpdateStatus: () => Promise<void>
  loadIcon: (bundlePath: string) => void
}

const inFlight = { live: false, processes: false, battery: false }

export const usePerformanceStore = create<PerformanceState>((set, get) => ({
  tab: 'overview',
  systemInfo: null,
  live: null,
  history: [],
  processes: null,
  includeSystem: false,
  battery: undefined,
  updateStatus: null,
  icons: {},
  error: null,

  setTab: (tab) => set({ tab }),
  setIncludeSystem: (includeSystem) => {
    set({ includeSystem })
    void get().refreshProcesses()
  },

  loadSystemInfo: async () => {
    if (get().systemInfo) return
    try {
      set({ systemInfo: await performanceService.getSystemInfo() })
    } catch (e) {
      set({ error: String(e) })
    }
  },

  refreshLive: async () => {
    // Skip a tick rather than queue calls if the previous one is still running.
    if (inFlight.live) return
    inFlight.live = true
    try {
      const live = await performanceService.getLiveMetrics()
      const point: HistoryPoint = {
        t: live.sampledAtMs,
        cpu: live.cpu?.total ?? null,
        memory: live.memory && live.memory.totalBytes > 0 ? (live.memory.usedBytes / live.memory.totalBytes) * 100 : null,
      }
      const cutoff = live.sampledAtMs - HISTORY_WINDOW_MS
      set((s) => ({ live, error: null, history: [...s.history.filter((p) => p.t >= cutoff), point] }))
    } catch (e) {
      set({ error: String(e) })
    } finally {
      inFlight.live = false
    }
  },

  refreshProcesses: async () => {
    if (inFlight.processes) return
    inFlight.processes = true
    try {
      set({ processes: await performanceService.getProcesses(get().includeSystem) })
    } catch (e) {
      set({ error: String(e) })
    } finally {
      inFlight.processes = false
    }
  },

  refreshBattery: async (refreshHealth = false) => {
    if (inFlight.battery) return
    inFlight.battery = true
    try {
      set({ battery: await performanceService.getBattery(refreshHealth) })
    } catch {
      set((s) => ({ battery: s.battery === undefined ? null : s.battery }))
    } finally {
      inFlight.battery = false
    }
  },

  refreshUpdateStatus: async () => {
    try {
      set({ updateStatus: await performanceService.getUpdateStatus() })
    } catch {
      set({ updateStatus: { state: 'unknown', macosUpdates: [], otherUpdates: [], lastCheckedMs: null } })
    }
  },

  loadIcon: (bundlePath) => {
    if (bundlePath in get().icons) return
    set((s) => ({ icons: { ...s.icons, [bundlePath]: null } }))
    performanceService
      .getAppIcon(bundlePath)
      .then((url) => set((s) => ({ icons: { ...s.icons, [bundlePath]: url } })))
      .catch(() => {})
  },
}))
