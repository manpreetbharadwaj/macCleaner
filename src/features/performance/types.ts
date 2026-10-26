/**
 * Mirrors src-tauri/src/perf/dto.rs. Anything macOS may not provide is
 * `null` — the UI shows "Not available" (or hides the row), never a guess.
 */

export interface DisplayInfo {
  name: string
  resolution: string | null
  pixels: string | null
  builtIn: boolean
  main: boolean
}

export interface OsInfo {
  name: string
  version: string | null
  build: string | null
  kernel: string | null
}

export interface SystemInfo {
  modelName: string | null
  marketingName: string | null
  modelIdentifier: string | null
  chip: string | null
  appleSilicon: boolean
  translated: boolean
  architecture: string
  physicalCores: number | null
  logicalCores: number | null
  performanceCores: number | null
  efficiencyCores: number | null
  gpuName: string | null
  gpuCores: number | null
  memoryBytes: number | null
  hostname: string | null
  displays: DisplayInfo[]
  os: OsInfo
}

export interface CpuStats {
  total: number
  user: number
  system: number
  idle: number
  logicalCores: number | null
}

export type MemoryPressure = 'normal' | 'warning' | 'critical'

export interface MemoryStats {
  totalBytes: number
  usedBytes: number
  appBytes: number
  wiredBytes: number
  compressedBytes: number
  cachedBytes: number
  availableBytes: number
  pressure: MemoryPressure | null
  swapTotalBytes: number | null
  swapUsedBytes: number | null
}

export interface LiveMetrics {
  sampledAtMs: number
  cpu: CpuStats | null
  memory: MemoryStats | null
  bootTimeMs: number | null
  uptimeSecs: number | null
}

export type ProcessKind = 'app' | 'background' | 'system'

export interface ProcessEntry {
  id: string
  pid: number
  name: string
  kind: ProcessKind
  bundleId: string | null
  bundlePath: string | null
  cpuPercent: number | null
  memoryBytes: number | null
  startedAtMs: number | null
  processCount: number
  isActive: boolean
  isHidden: boolean
  isSelf: boolean
  status: 'running' | 'idle' | 'stopped' | 'unknown'
}

export interface ProcessList {
  sampledAtMs: number
  entries: ProcessEntry[]
  totalProcesses: number
}

export interface ProcessDetails {
  pid: number
  executablePath: string | null
  bundleVersion: string | null
  threadCount: number | null
  parentPid: number | null
  ownedByYou: boolean
  helperPids: number[]
}

export interface BatteryInfo {
  percent: number | null
  isCharging: boolean
  fullyCharged: boolean
  onPowerAdapter: boolean
  minutesToEmpty: number | null
  minutesToFull: number | null
  cycleCount: number | null
  designCycleCount: number | null
  designCapacityMah: number | null
  fullChargeCapacityMah: number | null
  currentCapacityMah: number | null
  maximumCapacityPercent: number | null
  condition: string | null
}

export interface AvailableUpdate {
  name: string
  version: string | null
}

export interface UpdateStatus {
  state: 'up-to-date' | 'update-available' | 'unknown'
  macosUpdates: AvailableUpdate[]
  otherUpdates: AvailableUpdate[]
  lastCheckedMs: number | null
}

/** One point of the in-memory, session-only history used by the live charts. */
export interface HistoryPoint {
  t: number
  cpu: number | null
  memory: number | null
}

export interface QuitResult {
  status: 'terminated' | 'still_running' | 'not_found' | 'permission_denied'
}
