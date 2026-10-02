import { invoke } from '@tauri-apps/api/core'
import { isTauriRuntime } from '@/services/environment'
import { getAppIcon } from '@/services/tauri/bridge'
import type { BatteryInfo, LiveMetrics, ProcessDetails, ProcessList, SystemInfo, UpdateStatus } from './types'
import { mockPerformanceService } from './mockPerformanceService'

/**
 * All system data for the Performance tab. The Tauri implementation reads
 * real values from macOS (src-tauri/src/perf); the mock is only used by the
 * plain-browser preview (`npm run dev`), like the rest of the app.
 */
export interface PerformanceService {
  getSystemInfo(): Promise<SystemInfo>
  getLiveMetrics(): Promise<LiveMetrics>
  getProcesses(includeSystem: boolean): Promise<ProcessList>
  getProcessDetails(pid: number): Promise<ProcessDetails | null>
  /** null on Macs without a battery. */
  getBattery(refreshHealth: boolean): Promise<BatteryInfo | null>
  getUpdateStatus(): Promise<UpdateStatus>
  openSoftwareUpdate(): Promise<void>
  getAppIcon(bundlePath: string): Promise<string | null>
}

const tauriPerformanceService: PerformanceService = {
  getSystemInfo: () => invoke('perf_system_info'),
  getLiveMetrics: () => invoke('perf_live_metrics'),
  getProcesses: (includeSystem) => invoke('perf_processes', { includeSystem }),
  getProcessDetails: (pid) => invoke('perf_process_details', { pid }),
  getBattery: (refreshHealth) => invoke('perf_battery', { refreshHealth }),
  getUpdateStatus: () => invoke('perf_update_status'),
  openSoftwareUpdate: () => invoke('perf_open_software_update'),
  getAppIcon: (bundlePath) => getAppIcon(bundlePath),
}

export const performanceService: PerformanceService = isTauriRuntime() ? tauriPerformanceService : mockPerformanceService
