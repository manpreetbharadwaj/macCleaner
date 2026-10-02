import { i18n } from '@/i18n'
import { formatDateLocalized, formatNumber, formatPercentValue, formatRelative, formatUnit, unitLabel, type ByteUnit } from '@/i18n/format'

// Decimal (SI/1000-based), matching how macOS itself displays storage
// (Finder, About This Mac, System Settings > Storage all use decimal GB) —
// not binary GiB. Using 1024-based math here while labeling it "GB" was the
// root cause of this app's numbers looking wrong next to System Settings.
//
// Every string below is produced with the app language's Intl formatters:
// "1.5 GB" in English, "1,5 GB" in German, "1,5 Go" in French.
const GB = 1000 ** 3
const MB = 1000 ** 2
const KB = 1000

export function formatBytes(bytes: number, precision = 1): string {
  if (bytes <= 0) return formatUnit(0, 'megabyte', 0)
  if (bytes >= GB) return formatUnit(bytes / GB, 'gigabyte', precision)
  if (bytes >= MB) return formatUnit(bytes / MB, 'megabyte', precision)
  if (bytes >= KB) return formatUnit(bytes / KB, 'kilobyte', precision)
  return formatUnit(bytes, 'byte', 0)
}

export function formatBytesCompact(bytes: number): string {
  if (bytes >= GB) {
    const value = bytes / GB
    return formatUnit(value, 'gigabyte', value >= 100 ? 0 : 1)
  }
  if (bytes >= MB) return formatUnit(bytes / MB, 'megabyte', 0)
  return formatUnit(bytes / KB, 'kilobyte', 0)
}

export function gbToBytes(gb: number): number {
  return gb * GB
}

export function bytesToGb(bytes: number): number {
  return bytes / GB
}

export function formatPercent(value: number, total: number): string {
  if (total <= 0) return formatPercentValue(0)
  return formatPercentValue((value / total) * 100)
}

/** "Today", "Yesterday", "3 days ago", "2 weeks ago" … in the app language. */
export function formatRelativeDays(daysAgo: number): string {
  let text: string
  if (daysAgo <= 0) text = formatRelative(0, 'day')
  else if (daysAgo < 7) text = formatRelative(-daysAgo, 'day')
  else if (daysAgo < 30) text = formatRelative(-Math.floor(daysAgo / 7), 'week')
  else if (daysAgo < 365) text = formatRelative(-Math.floor(daysAgo / 30), 'month')
  else text = formatRelative(-Math.floor(daysAgo / 365), 'year')
  return capitalize(text)
}

function capitalize(text: string): string {
  return text ? text.charAt(0).toLocaleUpperCase(i18n.language) + text.slice(1) : text
}

export function formatDate(iso: string): string {
  return formatDateLocalized(iso, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateTime(iso: string): string {
  return formatDateLocalized(iso, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function daysAgoIso(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString()
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Splits a byte count into a number and localized unit for large, count-up displays ("18.4" + "GB"). */
export function splitBytes(bytes: number, precision = 1): { value: number; unit: string; decimals: number } {
  const pick = (value: number, unit: ByteUnit, decimals: number) => ({ value, unit: unitLabel(unit), decimals })
  if (bytes >= GB) return pick(bytes / GB, 'gigabyte', bytes / GB >= 100 ? 0 : precision)
  if (bytes >= MB) return pick(bytes / MB, 'megabyte', 0)
  if (bytes >= KB) return pick(bytes / KB, 'kilobyte', 0)
  return pick(Math.max(0, bytes), 'byte', 0)
}

/** Formats a count-up number with the app language's digits and separators. */
export function formatDecimal(value: number, decimals: number): string {
  return formatNumber(value, decimals, decimals)
}

/** "~/Downloads/file.dmg" instead of "/Users/alex/Downloads/file.dmg". */
export function tildePath(path: string, home?: string | null): string {
  const resolvedHome = home ?? path.match(/^\/Users\/[^/]+/)?.[0]
  if (resolvedHome && path.startsWith(resolvedHome)) return `~${path.slice(resolvedHome.length)}`
  return path
}

/** Parent folder of a path, tilde-shortened — what file rows show under the name. */
export function parentFolder(path: string): string {
  const short = tildePath(path)
  const idx = short.lastIndexOf('/')
  return idx > 0 ? short.slice(0, idx) : short
}

export function formatRelativeDate(iso: string | null | undefined): string {
  if (!iso) return i18n.t('common.unknown')
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
  return formatRelativeDays(days)
}

export function greeting(date = new Date()): string {
  const h = date.getHours()
  if (h < 5) return i18n.t('dashboard.greeting.evening')
  if (h < 12) return i18n.t('dashboard.greeting.morning')
  if (h < 18) return i18n.t('dashboard.greeting.afternoon')
  return i18n.t('dashboard.greeting.evening')
}
