import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { IconTile } from '@/components/ui/IconTile'

export function PageHeader({ title, subtitle, icon, color, actions }: { title: string; subtitle?: string; icon?: LucideIcon; color?: string; actions?: ReactNode }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="mb-7 flex items-center justify-between gap-6"
    >
      <div className="flex items-center gap-4">
        {icon && color && <IconTile icon={icon} color={color} size="lg" solid />}
        <div>
          <h1 className="font-display text-[26px] leading-tight font-bold tracking-[-0.025em] text-ink">{title}</h1>
          {subtitle && <p className="mt-0.5 text-[13.5px] text-ink-2">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </motion.header>
  )
}
