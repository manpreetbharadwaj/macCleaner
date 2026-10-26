import { invoke } from '@tauri-apps/api/core'
import { isTauriRuntime } from '@/services/environment'
import { getAppIcon } from '@/services/tauri/bridge'
import type { BatteryInfo, LiveMetrics, ProcessDetails, ProcessList, QuitResult, SystemInfo, UpdateStatus } from './types'
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
  /** Graceful quit — lets the app handle unsaved work (or show its own dialog). */
  quitProcess(pid: number, startedAtMs: number | null): Promise<QuitResult>
  /** Force quit — only ever called after the user confirms the warning. */
  forceQuitProcess(pid: number, startedAtMs: number | null): Promise<QuitResult>
  /** Native notification for the resource-alert engine (see alerts.ts). Returns whether it was submitted. */
  sendAlert(title: string, body: string, route: string): Promise<boolean>
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
  quitProcess: (pid, startedAtMs) => invoke('perf_quit_process', { pid, startedAtMs: startedAtMs ?? 0 }),
  forceQuitProcess: (pid, startedAtMs) => invoke('perf_force_quit_process', { pid, startedAtMs: startedAtMs ?? 0 }),
  sendAlert: (title, body, route) => invoke('perf_send_alert', { title, body, route }),
}

export const performanceService: PerformanceService = isTauriRuntime() ? tauriPerformanceService : mockPerformanceService
