import { useId } from 'react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  badge?: string
}

/** macOS-style segmented control with a sliding selection pill. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className,
}: {
  options: SegmentOption<T>[]
  value: T
  onChange: (v: T) => void
  size?: 'sm' | 'md'
  className?: string
}) {
  const id = useId()
  return (
    <div className={clsx('inline-flex rounded-[13px] bg-surface-3/80 p-[3px]', className)}>
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={clsx(
              'relative flex items-center gap-1.5 rounded-[10px] font-semibold transition-colors',
              size === 'sm' ? 'h-7 px-3 text-[12px]' : 'h-8 px-3.5 text-[12.5px]',
              active ? 'text-ink' : 'text-ink-3 hover:text-ink-2',
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-[10px] bg-surface shadow-[0_1px_3px_rgba(20,22,60,0.12),0_4px_12px_-4px_rgba(20,22,60,0.15)]"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">{opt.label}</span>
            {opt.badge && <span className="relative rounded-full bg-brand-soft px-1.5 text-[10.5px] text-brand">{opt.badge}</span>}
          </button>
        )
      })}
    </div>
  )
}
