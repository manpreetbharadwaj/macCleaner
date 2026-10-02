import { useEffect, useRef, useState } from 'react'
import { animate } from 'framer-motion'
import { formatDecimal, splitBytes } from '@/lib/format'

interface AnimatedNumberProps {
  value: number
  decimals?: number
  duration?: number
  className?: string
}

/** Counts from the previously shown value to the new one — used for every headline storage figure. */
export function AnimatedNumber({ value, decimals = 0, duration = 1.1, className }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0)
  const from = useRef(0)

  useEffect(() => {
    const controls = animate(from.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    })
    from.current = value
    return () => controls.stop()
  }, [value, duration])

  return (
    <span className={className}>
      {formatDecimal(display, decimals)}
    </span>
  )
}

/** "18.4 GB" with a count-up number and a lighter unit. */
export function AnimatedBytes({
  bytes,
  className,
  unitClassName = 'ms-1 text-[0.55em] font-semibold opacity-60',
  duration,
}: {
  bytes: number
  className?: string
  unitClassName?: string
  duration?: number
}) {
  const { value, unit, decimals } = splitBytes(bytes)
  return (
    <span className={className}>
      <AnimatedNumber value={value} decimals={decimals} duration={duration} className="tabular" />
      <span className={unitClassName}>{unit}</span>
    </span>
  )
}
