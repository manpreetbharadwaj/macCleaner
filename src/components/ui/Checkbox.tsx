import { motion } from 'framer-motion'
import { clsx } from 'clsx'

interface CheckboxProps {
  checked: boolean
  indeterminate?: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
  label?: string
  className?: string
}

/** Rounded checkbox with an animated draw-on check mark. */
export function Checkbox({ checked, indeterminate, disabled, onChange, label, className }: CheckboxProps) {
  const on = checked || indeterminate
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
      className={clsx(
        'relative flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[7px] border transition-all duration-200 active:scale-90 disabled:opacity-35',
        on ? 'border-transparent brand-gradient shadow-[0_3px_10px_-3px_rgba(91,108,255,0.7)]' : 'border-line-strong bg-surface hover:border-brand/60',
        className,
      )}
    >
      {indeterminate ? (
        <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} className="h-[2.5px] w-2.5 rounded-full bg-white" />
      ) : (
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none">
          <motion.path
            d="M3.5 8.4 6.6 11.3 12.6 4.9"
            stroke="white"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          />
        </svg>
      )}
    </button>
  )
}
