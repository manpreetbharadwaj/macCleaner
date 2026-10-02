import { motion } from 'framer-motion'
import { clsx } from 'clsx'

/** Animated horizontal usage bar. */
export function Bar({ value, max, color, className, delay = 0, height = 8 }: { value: number; max: number; color: string; className?: string; delay?: number; height?: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className={clsx('w-full overflow-hidden rounded-full bg-surface-3', className)} style={{ height }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${color} 75%, #fff), ${color})` }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  )
}

export interface StackSegment {
  id: string
  value: number
  color: string
  label?: string
}

/** One bar split into colored segments — the Storage screen's overview strip. */
export function StackedBar({ segments, total, height = 14 }: { segments: StackSegment[]; total: number; height?: number }) {
  return (
    <div className="flex w-full gap-[3px] overflow-hidden rounded-full bg-surface-3" style={{ height }}>
      {segments
        .filter((s) => s.value > 0)
        .map((s, i) => (
          <motion.div
            key={s.id}
            title={s.label}
            className="h-full first:rounded-s-full last:rounded-e-full"
            style={{ background: s.color }}
            initial={{ width: 0 }}
            animate={{ width: `${(s.value / Math.max(1, total)) * 100}%` }}
            transition={{ duration: 1, delay: 0.1 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
    </div>
  )
}
