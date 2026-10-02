import { formatBytes } from '@/lib/format'
import { i18n } from '@/i18n'
import { formatDateLocalized, formatNumber, formatPercentValue, formatUnit } from '@/i18n/format'
import type { ProcessEntry } from './types'

/** "Not available" in the current language — used instead of ever rendering null/undefined/NaN. */
export function notAvailable(): string {
  return i18n.t('common.notAvailable')
}

/** Never renders null/undefined/NaN — falls back to "Not available". */
export function orNA<T>(value: T | null | undefined, render: (v: T) => string = String): string {
  if (value === null || value === undefined) return notAvailable()
  if (typeof value === 'number' && !Number.isFinite(value)) return notAvailable()
  return render(value)
}

export function bytesOrNA(bytes: number | null | undefined): string {
  return orNA(bytes, (b) => formatBytes(b))
}

/** Memory is shown in binary GB, like About This Mac ("16 GB"), with the language's own separators. */
export function formatMemory(bytes: number, digits = 1): string {
  const gib = bytes / 1024 ** 3
  if (gib >= 1) {
    const whole = Number.isInteger(Number(gib.toFixed(digits)))
    return formatUnit(gib, 'gigabyte', whole ? 0 : digits)
  }
  return formatUnit(Math.round(bytes / 1024 ** 2), 'megabyte', 0)
}

export function formatPercent(value: number | null | undefined, digits = 0): string {
  return orNA(value, (v) => formatPercentValue(v, digits))
}

export function formatCount(value: number): string {
  return formatNumber(value)
}

/** 2d 7h, 3h 24m, 12m, <1m — in the app language. */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return notAvailable()
  const mins = Math.floor(ms / 60_000)
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  if (d > 0) return i18n.t('performance.duration.dh', { d, h })
  if (h > 0) return i18n.t('performance.duration.hm', { h, m })
  if (m > 0) return i18n.t('performance.duration.m', { m })
  return i18n.t('performance.duration.lessThanMinute')
}

export function uptimeParts(secs: number): { days: number; hours: number; minutes: number } {
  return { days: Math.floor(secs / 86400), hours: Math.floor((secs % 86400) / 3600), minutes: Math.floor((secs % 3600) / 60) }
}

export function formatClock(ms: number): string {
  return formatDateLocalized(ms, { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? i18n.t('performance.duration.hm', { h, m }) : i18n.t('performance.duration.m', { m })
}

/** "Good" is what System Settings → Battery displays as "Normal". Anything else is shown exactly as macOS reports it. */
export function batteryConditionLabel(condition: string | null): string {
  if (!condition) return notAvailable()
  const c = condition.toLowerCase()
  if (c === 'good') return i18n.t('performance.battery.conditionNormal')
  if (c.includes('service')) return i18n.t('performance.battery.conditionService')
  return condition
}

export function batteryConditionTone(condition: string | null): 'good' | 'warn' | 'neutral' {
  if (!condition) return 'neutral'
  return condition.toLowerCase() === 'good' ? 'good' : 'warn'
}

export function pressureLabel(pressure: 'normal' | 'warning' | 'critical'): string {
  return i18n.t(`performance.pressure.${pressure}`)
}

/** Extra state worth showing for Dock apps: frontmost or hidden. */
export function stateLabel(e: ProcessEntry): { label: string; tone: 'good' | 'info' | 'neutral' } | null {
  if (e.kind !== 'app') return null
  if (e.isActive) return { label: i18n.t('performance.apps.inUse'), tone: 'good' }
  if (e.isHidden) return { label: i18n.t('performance.apps.hidden'), tone: 'neutral' }
  return null
}
