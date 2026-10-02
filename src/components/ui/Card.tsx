import type { HTMLAttributes, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Lifts slightly on hover — for clickable cards. */
  interactive?: boolean
}

export function Card({ interactive, className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'card',
        interactive && 'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] hover:border-line-strong',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/** Fades + rises content in with a small stagger, for page sections. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[12.5px] text-ink-3">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
