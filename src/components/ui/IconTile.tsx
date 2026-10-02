import type { LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'

interface IconTileProps {
  icon: LucideIcon
  color: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Solid gradient fill instead of a soft tint. */
  solid?: boolean
  className?: string
}

const dims = {
  sm: { box: 'h-8 w-8 rounded-[10px]', icon: 15 },
  md: { box: 'h-10 w-10 rounded-xl', icon: 18 },
  lg: { box: 'h-12 w-12 rounded-[14px]', icon: 22 },
  xl: { box: 'h-16 w-16 rounded-[20px]', icon: 28 },
}

/** A colored squircle holding an icon — the app's recurring category marker. */
export function IconTile({ icon: Icon, color, size = 'md', solid, className }: IconTileProps) {
  const d = dims[size]
  return (
    <div
      className={clsx('flex shrink-0 items-center justify-center', d.box, className)}
      style={
        solid
          ? { background: `linear-gradient(140deg, ${color}, color-mix(in srgb, ${color} 65%, #6e5bff))`, color: '#fff', boxShadow: `0 8px 20px -8px ${color}` }
          : { background: `color-mix(in srgb, ${color} 14%, transparent)`, color }
      }
    >
      <Icon size={d.icon} strokeWidth={2.1} />
    </div>
  )
}
