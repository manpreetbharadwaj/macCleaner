import { useAppStore } from '@/store/useAppStore'
import { i18n } from '@/i18n'
import { performanceService } from './performanceService'
import { formatMemory } from './format'
import type { LiveMetrics, ProcessList } from './types'

/**
 * Smart high-memory / high-CPU / critical-pressure warnings for the
 * Performance tab (spec section D). Deliberately lives alongside the
 * existing shared polling in usePerformancePolling rather than starting a
 * second timer: usePerformanceStore already calls `evaluateProcessAlerts`
 * and `evaluatePressureAlert` once per live/process refresh, so this adds
 * no extra sampling of its own.
 *
 * Each condition must hold for several *consecutive* samples before it
 * fires (a brief spike never does), and each fired alert — keyed by app +
 * condition — has its own cooldown, so a sustained condition notifies once
 * and then stays quiet. None of this persists across an app restart: there
 * is no always-on background monitor here (see Phase 3 of the spec) — only
 * this running app's own polling.
 */

const SUSTAIN_SAMPLES = 3
const PRESSURE_SUSTAIN_SAMPLES = 2
const COOLDOWN_MS = 15 * 60 * 1000

interface Streak {
  memory: number
  percent: number
  cpu: number
}

const streaks = new Map<string, Streak>()
const cooldowns = new Map<string, number>()
let pressureStreak = 0

function onCooldown(key: string, now: number): boolean {
  const last = cooldowns.get(key)
  return last !== undefined && now - last < COOLDOWN_MS
}

function fire(key: string, now: number, title: string, body: string) {
  cooldowns.set(key, now)
  void performanceService.sendAlert(title, body, '/performance')
}

/** Settings gate shared by both evaluators; also respects the existing global notifications toggle. */
function alertSettings() {
  const settings = useAppStore.getState().settings
  if (!settings?.notificationsEnabled) return null
  const alerts = settings.performanceAlerts
  return alerts?.enabled ? alerts : null
}

/** Call once per processes refresh, after the store's `processes` is updated. */
export function evaluateProcessAlerts(list: ProcessList, totalMemoryBytes: number | null): void {
  const alerts = alertSettings()
  const now = Date.now()
  const seen = new Set<string>()

  for (const e of list.entries) {
    // Never alert about system/root processes or MacBook Cleaner itself.
    if (e.isSelf || e.kind === 'system') continue
    seen.add(e.id)
    const streak = streaks.get(e.id) ?? { memory: 0, percent: 0, cpu: 0 }

    // Stale/invalid samples (macOS wouldn't let us read this app's usage)
    // never count toward — or reset — a streak; they're simply skipped.
    if (e.memoryBytes !== null) {
      const memMb = e.memoryBytes / 1_000_000
      const overAbsolute = !!alerts?.highMemoryEnabled && memMb >= alerts.highMemoryThresholdMb
      streak.memory = overAbsolute ? streak.memory + 1 : 0

      const overPercent = !!alerts?.highMemoryPercentEnabled && !!totalMemoryBytes && (e.memoryBytes / totalMemoryBytes) * 100 >= alerts.highMemoryPercentThreshold
      streak.percent = overPercent ? streak.percent + 1 : 0
    }
    if (e.cpuPercent !== null) {
      const overCpu = !!alerts?.backgroundCpuEnabled && e.kind === 'background' && e.cpuPercent >= alerts.backgroundCpuThreshold
      streak.cpu = overCpu ? streak.cpu + 1 : 0
    }
    streaks.set(e.id, streak)

    if (!alerts) continue
    const memKey = `mem:${e.id}`
    if ((streak.memory >= SUSTAIN_SAMPLES || streak.percent >= SUSTAIN_SAMPLES) && !onCooldown(memKey, now)) {
      fire(
        memKey,
        now,
        i18n.t('performance.alerts.notifications.highMemoryTitle') as string,
        i18n.t('performance.alerts.notifications.highMemoryBody', { app: e.name, size: formatMemory(e.memoryBytes ?? 0) }) as string,
      )
    }
    const cpuKey = `cpu:${e.id}`
    if (streak.cpu >= SUSTAIN_SAMPLES && !onCooldown(cpuKey, now)) {
      fire(
        cpuKey,
        now,
        i18n.t('performance.alerts.notifications.backgroundCpuTitle') as string,
        i18n.t('performance.alerts.notifications.backgroundCpuBody', { app: e.name, percent: Math.round(e.cpuPercent ?? 0) }) as string,
      )
    }
  }

  // An app that quit or fell out of view starts fresh if it (or its pid) comes back.
  for (const id of streaks.keys()) if (!seen.has(id)) streaks.delete(id)
}

/** Call once per live-metrics refresh, after the store's `live` is updated. */
export function evaluatePressureAlert(live: LiveMetrics): void {
  const alerts = alertSettings()
  if (!alerts?.criticalPressureEnabled) {
    pressureStreak = 0
    return
  }
  const critical = live.memory?.pressure === 'critical'
  pressureStreak = critical ? pressureStreak + 1 : 0
  const now = Date.now()
  if (pressureStreak >= PRESSURE_SUSTAIN_SAMPLES && !onCooldown('pressure', now)) {
    fire(
      'pressure',
      now,
      i18n.t('performance.alerts.notifications.pressureTitle') as string,
      i18n.t('performance.alerts.notifications.pressureBody') as string,
    )
  }
}
