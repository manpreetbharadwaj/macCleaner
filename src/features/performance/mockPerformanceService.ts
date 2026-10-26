import type { PerformanceService } from './performanceService'
import type { ProcessEntry } from './types'

/**
 * Sample data for the plain-browser preview only (the desktop app always
 * reads real values). Numbers drift gently so the live charts move.
 */

const GB = 1000 ** 3
const MB = 1000 ** 2
const HOUR = 3_600_000
const bootMs = Date.now() - (2 * 24 + 7) * HOUR - 14 * 60_000

function wave(seed: number, base: number, amp: number): number {
  const t = Date.now() / 1000
  return Math.max(0, base + amp * Math.sin(t / 7 + seed) + amp * 0.5 * Math.sin(t / 2.3 + seed * 3) + (Math.random() - 0.5) * amp * 0.4)
}

const APPS: Array<[string, number, number, number, number]> = [
  // name, cpu %, memory MB, running hours, process count
  ['Google Chrome', 14, 1800, 3.4, 18],
  ['Visual Studio Code', 7, 860, 1.3, 14],
  ['Slack', 2.4, 610, 6.1, 6],
  ['Figma', 3.1, 540, 2.2, 5],
  ['Spotify', 1, 420, 5.2, 4],
  ['Mail', 0.4, 210, 31, 2],
  ['Messages', 0.2, 160, 31, 2],
  ['Finder', 0.3, 140, 55.2, 1],
  ['Notes', 0.1, 120, 8.5, 1],
  ['Terminal', 0.6, 95, 1.9, 1],
  ['MacBook Cleaner', 0.8, 130, 0.4, 1],
]

const BACKGROUND: Array<[string, number, number, number]> = [
  ['Dropbox', 0.6, 240, 55],
  ['1Password', 0.3, 180, 55],
  ['node', 4.2, 320, 1.1],
  ['Docker', 1.1, 410, 55],
  ['Rectangle', 0.1, 60, 55],
  ['iCloud Drive', 0.2, 70, 55],
]

function entries(includeSystem: boolean): ProcessEntry[] {
  const now = Date.now()
  const list: ProcessEntry[] = APPS.map(([name, cpu, mem, hours, procs], i) => ({
    id: `app:${400 + i}`,
    pid: 400 + i * 37,
    name,
    kind: 'app',
    bundleId: null,
    bundlePath: null,
    cpuPercent: Math.round(wave(i, cpu, cpu * 0.35) * 10) / 10,
    memoryBytes: Math.round(wave(i, mem, mem * 0.04) * MB),
    startedAtMs: now - hours * HOUR,
    processCount: procs,
    isActive: i === 0,
    isHidden: false,
    isSelf: name === 'MacBook Cleaner',
    status: 'running',
  }))
  BACKGROUND.forEach(([name, cpu, mem, hours], i) =>
    list.push({
      id: `proc:${900 + i}`,
      pid: 900 + i * 13,
      name,
      kind: 'background',
      bundleId: null,
      bundlePath: null,
      cpuPercent: Math.round(wave(i + 20, cpu, cpu * 0.3) * 10) / 10,
      memoryBytes: mem * MB,
      startedAtMs: now - hours * HOUR,
      processCount: 1,
      isActive: false,
      isHidden: false,
      isSelf: false,
      status: 'idle',
    }),
  )
  if (includeSystem) {
    ;['WindowServer', 'kernel_task', 'mds_stores', 'launchd'].forEach((name, i) =>
      list.push({
        id: `proc:${50 + i}`,
        pid: 50 + i,
        name,
        kind: 'system',
        bundleId: null,
        bundlePath: null,
        cpuPercent: null,
        memoryBytes: null,
        startedAtMs: bootMs,
        processCount: 1,
        isActive: false,
        isHidden: false,
        isSelf: false,
        status: 'unknown',
      }),
    )
  }
  return list
}

const delay = <T,>(value: T, ms = 120) => new Promise<T>((r) => setTimeout(() => r(value), ms))

export const mockPerformanceService: PerformanceService = {
  getSystemInfo: () =>
    delay({
      modelName: 'MacBook Pro',
      marketingName: 'MacBook Pro (14-inch, 2023)',
      modelIdentifier: 'Mac14,9',
      chip: 'Apple M2 Pro',
      appleSilicon: true,
      translated: false,
      architecture: 'arm64',
      physicalCores: 10,
      logicalCores: 10,
      performanceCores: 6,
      efficiencyCores: 4,
      gpuName: 'Apple M2 Pro',
      gpuCores: 16,
      memoryBytes: 16 * 1024 ** 3,
      hostname: 'MacBook-Pro.local',
      displays: [{ name: 'Built-in Liquid Retina XDR Display', resolution: '1512 x 982 @ 120.00Hz', pixels: '3024 x 1964', builtIn: true, main: true }],
      os: { name: 'macOS Tahoe', version: '26.5', build: '25F71', kernel: '25.5.0' },
    }),
  getLiveMetrics: () => {
    const total = 16 * 1024 ** 3
    const app = wave(1, 6.1 * GB, 0.25 * GB)
    const wired = 2.4 * GB
    const compressed = wave(2, 1.6 * GB, 0.1 * GB)
    const used = app + wired + compressed
    const cpu = wave(3, 24, 9)
    return delay(
      {
        sampledAtMs: Date.now(),
        cpu: { total: Math.round(cpu * 10) / 10, user: Math.round(cpu * 0.68 * 10) / 10, system: Math.round(cpu * 0.32 * 10) / 10, idle: Math.round((100 - cpu) * 10) / 10, logicalCores: 10 },
        memory: {
          totalBytes: total,
          usedBytes: used,
          appBytes: app,
          wiredBytes: wired,
          compressedBytes: compressed,
          cachedBytes: 3.9 * GB,
          availableBytes: total - used,
          pressure: 'normal',
          swapTotalBytes: 2 * 1024 ** 3,
          swapUsedBytes: 1.2 * GB,
        },
        bootTimeMs: bootMs,
        uptimeSecs: Math.floor((Date.now() - bootMs) / 1000),
      },
      40,
    )
  },
  getProcesses: (includeSystem) => delay({ sampledAtMs: Date.now(), entries: entries(includeSystem), totalProcesses: 612 }, 60),
  getProcessDetails: (pid) =>
    delay({ pid, executablePath: null, bundleVersion: '1.0', threadCount: 42, parentPid: 1, ownedByYou: true, helperPids: [] }),
  getBattery: () =>
    delay({
      percent: 87,
      isCharging: false,
      fullyCharged: false,
      onPowerAdapter: false,
      minutesToEmpty: 412,
      minutesToFull: null,
      cycleCount: 264,
      designCycleCount: 1000,
      designCapacityMah: 6075,
      fullChargeCapacityMah: 5530,
      currentCapacityMah: 4811,
      maximumCapacityPercent: 91,
      condition: 'Good',
    }),
  getUpdateStatus: () => delay({ state: 'up-to-date', macosUpdates: [], otherUpdates: [], lastCheckedMs: Date.now() - 5 * HOUR }),
  openSoftwareUpdate: async () => {},
  getAppIcon: async () => null,
  // The browser preview has no real processes to signal — simulate a
  // successful quit so the UI flow (confirm, optimistic update, refresh)
  // can still be exercised with `npm run dev`.
  quitProcess: () => delay({ status: 'terminated' as const }, 300),
  forceQuitProcess: () => delay({ status: 'terminated' as const }, 300),
  sendAlert: () => delay(false, 0),
}
