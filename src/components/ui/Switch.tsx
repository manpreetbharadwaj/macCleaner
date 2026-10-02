import { motion } from 'framer-motion'
import { clsx } from 'clsx'

export function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative inline-flex h-[26px] w-[44px] shrink-0 items-center rounded-full p-[3px] transition-colors duration-300 disabled:opacity-40',
        checked ? 'brand-gradient' : 'bg-surface-3',
      )}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 600, damping: 34 }}
        className={clsx('h-5 w-5 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.25)]', checked ? 'ms-auto' : '')}
      />
    </button>
  )
}
