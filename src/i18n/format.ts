import { formattingLocale, i18n } from './index'

/**
 * Locale-aware formatting. Everything uses the *app's* language (which may
 * differ from the Mac's), via the standard Intl APIs — no hand-rolled
 * separators or month names anywhere.
 */

const cache = new Map<string, Intl.NumberFormat>()
function nf(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const locale = formattingLocale()
  const key = `${locale}|${JSON.stringify(options)}`
  let f = cache.get(key)
  if (!f) {
    f = new Intl.NumberFormat(locale, options)
    cache.set(key, f)
  }
  return f
}

export function formatNumber(value: number, maxFractionDigits = 0, minFractionDigits = 0): string {
  return nf({ maximumFractionDigits: maxFractionDigits, minimumFractionDigits: minFractionDigits }).format(value)
}

/** 0–100 → "37 %" / "37%" / "%37" depending on the language. */
export function formatPercentValue(value: number, digits = 0): string {
  return nf({ style: 'percent', maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value / 100)
}

export type ByteUnit = 'byte' | 'kilobyte' | 'megabyte' | 'gigabyte' | 'terabyte'

/** A number with a localized unit, e.g. "1.5 GB", "1,5 GB", "1,5 Go". */
export function formatUnit(value: number, unit: ByteUnit, digits: number): string {
  return nf({ style: 'unit', unit, unitDisplay: 'short', maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value)
}

/** Just the localized unit label ("GB", "Go", …), for big count-up numbers rendered separately. */
export function unitLabel(unit: ByteUnit): string {
  const parts = nf({ style: 'unit', unit, unitDisplay: 'short' }).formatToParts(1)
  return parts.find((p) => p.type === 'unit')?.value ?? unit
}

export function formatDateLocalized(date: Date | string | number, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(formattingLocale(), options).format(new Date(date))
}

const rtfCache = new Map<string, Intl.RelativeTimeFormat>()
export function formatRelative(value: number, unit: Intl.RelativeTimeFormatUnit): string {
  const locale = formattingLocale()
  let f = rtfCache.get(locale)
  if (!f) {
    f = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
    rtfCache.set(locale, f)
  }
  return f.format(value, unit)
}

/** Locale-aware list: "A, B and C" / "A, B und C". */
export function formatList(items: string[]): string {
  return new Intl.ListFormat(formattingLocale(), { style: 'long', type: 'conjunction' }).format(items)
}

// Formatters are per-language; drop cached ones when the language changes.
i18n.on('languageChanged', () => {
  cache.clear()
  rtfCache.clear()
})
