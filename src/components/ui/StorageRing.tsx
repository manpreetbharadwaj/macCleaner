import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

export interface RingSegment {
  id: string
  value: number
  color: string
}

interface StorageRingProps {
  segments: RingSegment[]
  total: number
  size?: number
  thickness?: number
  /** Gap between segments, in degrees. */
  gap?: number
  children?: ReactNode
  /** Shimmering placeholder ring while there's nothing to show yet. */
  loading?: boolean
}

/**
 * Multi-segment donut. Each colored arc draws itself in sequence on mount
 * and smoothly re-flows when values change (e.g. after a cleanup).
 */
export function StorageRing({ segments, total, size = 260, thickness = 22, gap = 1.6, children, loading }: StorageRingProps) {
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const gapLen = (gap / 360) * c
  const visible = segments.filter((s) => s.value > 0)
  let offset = 0

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-3)" strokeWidth={thickness} />
        {loading && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="url(#ring-loading)"
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${c * 0.22} ${c}`}
            animate={{ strokeDashoffset: [0, -c] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
          />
        )}
        <defs>
          <linearGradient id="ring-loading" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4f8bff" stopOpacity="0.1" />
            <stop offset="1" stopColor="#8b5cf6" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        {!loading &&
          visible.map((segment, i) => {
            const len = total > 0 ? (segment.value / total) * c : 0
            const drawn = Math.max(0, len - (visible.length > 1 ? gapLen : 0))
            const dashOffset = -offset
            offset += len
            return (
              <motion.circle
                key={segment.id}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={segment.color}
                strokeWidth={thickness}
                strokeLinecap="butt"
                initial={{ strokeDasharray: `0 ${c}`, strokeDashoffset: dashOffset }}
                animate={{ strokeDasharray: `${drawn} ${c}`, strokeDashoffset: dashOffset }}
                transition={{ duration: 1.1, delay: 0.15 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                style={{ filter: `drop-shadow(0 0 6px color-mix(in srgb, ${segment.color} 35%, transparent))` }}
              />
            )
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}
