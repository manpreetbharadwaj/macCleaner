import { create } from 'zustand'
import { performanceService } from './performanceService'
import { evaluatePressureAlert, evaluateProcessAlerts } from './alerts'
import type { BatteryInfo, HistoryPoint, LiveMetrics, ProcessList, QuitResult, SystemInfo, UpdateStatus } from './types'

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
  /** pid -> which action is in flight, so a row can show a spinner and disable both buttons. */
  pendingQuits: Record<number, 'quit' | 'force'>

  setTab: (tab: PerformanceTab) => void
  setIncludeSystem: (on: boolean) => void
  loadSystemInfo: () => Promise<void>
  refreshLive: () => Promise<void>
  refreshProcesses: () => Promise<void>
  refreshBattery: (refreshHealth?: boolean) => Promise<void>
  refreshUpdateStatus: () => Promise<void>
  loadIcon: (bundlePath: string) => void
  quitProcess: (pid: number, startedAtMs: number | null, force: boolean) => Promise<QuitResult>
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
  pendingQuits: {},

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
      evaluatePressureAlert(live)
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
      const processes = await performanceService.getProcesses(get().includeSystem)
      set({ processes })
      evaluateProcessAlerts(processes, get().live?.memory?.totalBytes ?? null)
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

  quitProcess: async (pid, startedAtMs, force) => {
    set((s) => ({ pendingQuits: { ...s.pendingQuits, [pid]: force ? 'force' : 'quit' } }))
    try {
      const result = force ? await performanceService.forceQuitProcess(pid, startedAtMs) : await performanceService.quitProcess(pid, startedAtMs)
      // Whatever happened, the process list is now stale — refresh it so
      // the UI reflects reality instead of an optimistic guess.
      await get().refreshProcesses()
      return result
    } finally {
      set((s) => {
        const pendingQuits = { ...s.pendingQuits }
        delete pendingQuits[pid]
        return { pendingQuits }
      })
    }
  },
}))
