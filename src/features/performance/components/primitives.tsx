import { useEffect, useId, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Info } from 'lucide-react'
import { clsx } from 'clsx'
import { HISTORY_WINDOW_MS, usePerformanceStore } from '../usePerformanceStore'
import { useTranslation } from 'react-i18next'
import { formatPercentValue } from '@/i18n/format'
import type { HistoryPoint } from '../types'

/** Single-value progress ring. `value` is 0–100; null renders an empty track. */
export function Gauge({ value, color, size = 92, thickness = 9, children }: { value: number | null; color: string; size?: number; thickness?: number; children?: ReactNode }) {
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const pct = value === null ? 0 : Math.max(0, Math.min(100, value))
  const id = useId()
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={color} />
            <stop offset="1" stopColor={`color-mix(in srgb, ${color} 55%, #6e5bff)`} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-3)" strokeWidth={thickness} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={thickness}
          strokeLinecap="round"
          initial={false}
          animate={{ strokeDasharray: `${(pct / 100) * c} ${c}` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 5px color-mix(in srgb, ${color} 35%, transparent))` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}

/**
 * Area chart of the last 60 seconds (0–100%). Pure SVG, redrawn only when a
 * new sample arrives (every 2–6 s) — no animation loop, so it costs nothing
 * between samples.
 */
export function LiveChart({ points, pick, color, height = 96, label }: { points: HistoryPoint[]; pick: (p: HistoryPoint) => number | null; color: string; height?: number; label: string }) {
  const { t } = useTranslation()
  const id = useId()
  const width = 320
  const valid = points.map((p) => ({ t: p.t, v: pick(p) })).filter((p): p is { t: number; v: number } => p.v !== null)
  const end = valid.length ? valid[valid.length - 1].t : 0
  const start = end - HISTORY_WINDOW_MS
  const x = (t: number) => ((t - start) / HISTORY_WINDOW_MS) * width
  const y = (v: number) => height - 4 - (Math.max(0, Math.min(100, v)) / 100) * (height - 8)
  const line = valid.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')
  const area = valid.length > 1 ? `${line} L${x(valid[valid.length - 1].t).toFixed(1)},${height} L${x(valid[0].t).toFixed(1)},${height} Z` : ''
  const last = valid[valid.length - 1]

  return (
    <figure className="relative" aria-label={label} dir="ltr">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block h-full w-full overflow-visible" style={{ height }} role="img" aria-label={last ? t('performance.chartNow', { label, value: formatPercentValue(last.v) }) : label}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.32" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[25, 50, 75].map((g) => (
          <line key={g} x1="0" x2={width} y1={y(g)} y2={y(g)} stroke="var(--color-line)" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
        ))}
        {area && <path d={area} fill={`url(#${id})`} />}
        {valid.length > 1 && <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
      </svg>
      {last && (
        <span className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-[3px] ring-surface" style={{ left: `${(x(last.t) / width) * 100}%`, top: y(last.v), background: color }} />
      )}
      <figcaption className="mt-1.5 flex justify-between text-[10.5px] font-medium text-ink-3">
        <span>{t('performance.chart60s')}</span>
        <span>{t('performance.chartNow2')}</span>
      </figcaption>
    </figure>
  )
}

/** Small (i) with a plain-language explanation on hover or keyboard focus. */
export function InfoTip({ children, label }: { children: ReactNode; label?: string }) {
  const { t } = useTranslation()
  return (
    <span className="group/tip relative inline-flex align-middle">
      <button type="button" aria-label={label ? t('performance.aboutX', { name: label }) : t('performance.moreInfo')} className="flex h-4.5 w-4.5 items-center justify-center rounded-full text-ink-3 transition-colors hover:text-ink focus-visible:text-ink">
        <Info size={13} />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full left-1/2 z-30 mb-2 w-64 -translate-x-1/2 rounded-xl bg-ink px-3 py-2 text-[11.5px] leading-snug font-medium text-canvas opacity-0 shadow-lg transition-opacity duration-150 group-focus-within/tip:visible group-focus-within/tip:opacity-100 group-hover/tip:visible group-hover/tip:opacity-100"
      >
        {children}
      </span>
    </span>
  )
}

export type Tone = 'good' | 'warn' | 'bad' | 'neutral' | 'info'

const TONES: Record<Tone, string> = {
  good: 'bg-mint-soft text-mint',
  warn: 'bg-sun-soft text-sun',
  bad: 'bg-danger-soft text-danger',
  neutral: 'bg-surface-3 text-ink-2',
  info: 'bg-brand-soft text-brand',
}

export function StatusChip({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11.5px] font-semibold whitespace-nowrap', TONES[tone], className)}>{children}</span>
}

export function KeyValue({ label, value, tip, mono }: { label: string; value: ReactNode; tip?: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-6 px-5 py-3">
      <span className="flex items-center gap-1 text-[13px] text-ink-2">
        {label}
        {tip && <InfoTip label={label}>{tip}</InfoTip>}
      </span>
      <span className={clsx('selectable min-w-0 text-end text-[13px] font-semibold break-words text-ink', mono && 'font-mono text-[12px]')}>{value}</span>
    </div>
  )
}

const MONO_COLORS = ['#5b6cff', '#8b5cf6', '#13b5e0', '#19c39a', '#ff8a4c', '#f0508a', '#f5b400']

/** The app's real icon (extracted natively, cached) or a colored monogram. */
export function ProcessIcon({ name, bundlePath, size = 34 }: { name: string; bundlePath: string | null; size?: number }) {
  const icon = usePerformanceStore((s) => (bundlePath ? s.icons[bundlePath] : null))
  const loadIcon = usePerformanceStore((s) => s.loadIcon)
  useEffect(() => {
    if (bundlePath) loadIcon(bundlePath)
  }, [bundlePath, loadIcon])

  if (icon) return <img src={icon} alt="" width={size} height={size} className="shrink-0" style={{ width: size, height: size }} />
  const color = MONO_COLORS[[...name].reduce((h, c) => h + c.charCodeAt(0), 0) % MONO_COLORS.length]
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-[9px] font-display text-[14px] font-bold text-white"
      style={{ width: size, height: size, background: `linear-gradient(140deg, ${color}, color-mix(in srgb, ${color} 60%, #6e5bff))` }}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton', className)} />
}
