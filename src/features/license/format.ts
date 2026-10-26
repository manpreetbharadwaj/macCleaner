import { tDynamic } from '@/i18n'

/** Picks the single largest non-zero unit — a badge/status line needs "2 days", not "2 days 3 hours 12 minutes". */
export function formatRemaining(ms: number): string {
  const minutes = Math.floor(ms / 60_000)
  if (minutes <= 0) return tDynamic('license.remaining.lessThanAMinute')
  const hours = Math.floor(minutes / 60)
  if (hours <= 0) return tDynamic('license.remaining.minutes', { count: minutes })
  const days = Math.floor(hours / 24)
  if (days <= 0) return tDynamic('license.remaining.hours', { count: hours })
  return tDynamic('license.remaining.days', { count: days })
}
