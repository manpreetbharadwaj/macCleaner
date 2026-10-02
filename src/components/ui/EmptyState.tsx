import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  subtitle: string
  color?: string
  action?: ReactNode
}

function Sparkle({ x, y, s, delay, color }: { x: string; y: string; s: number; delay: number; color: string }) {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      width={s}
      height={s}
      className="absolute"
      style={{ left: x, top: y, color }}
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: [0, 1, 0.7, 1], scale: [0.4, 1, 0.85, 1], rotate: [0, 15, 0] }}
      transition={{ duration: 2.4, delay, repeat: Infinity, repeatType: 'reverse' }}
    >
      <path d="M12 0 Q13.4 10.6 24 12 Q13.4 13.4 12 24 Q10.6 13.4 0 12 Q10.6 10.6 12 0Z" fill="currentColor" />
    </motion.svg>
  )
}

/** A friendly, illustrated empty state — never a blank screen. */
export function EmptyState({ icon: Icon, title, subtitle, color = '#5b6cff', action }: EmptyStateProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center px-6 py-16 text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="relative mb-6 h-36 w-44">
        <div
          className="absolute inset-x-6 inset-y-3 rounded-full blur-2xl"
          style={{ background: `radial-gradient(circle, color-mix(in srgb, ${color} 30%, transparent), transparent 70%)` }}
        />
        <div className="animate-float absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-[26px] text-white"
            style={{ background: `linear-gradient(140deg, ${color}, color-mix(in srgb, ${color} 55%, #8b5cf6))`, boxShadow: `0 18px 40px -12px ${color}` }}
          >
            <Icon size={34} strokeWidth={1.9} />
          </div>
        </div>
        <Sparkle x="8%" y="12%" s={18} delay={0} color="#19c39a" />
        <Sparkle x="80%" y="6%" s={14} delay={0.6} color={color} />
        <Sparkle x="86%" y="70%" s={20} delay={1.1} color="#13b5e0" />
        <Sparkle x="4%" y="72%" s={11} delay={1.6} color="#ff8a4c" />
      </div>
      <h3 className="font-display text-[19px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[13.5px] text-ink-2">{subtitle}</p>
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  )
}
