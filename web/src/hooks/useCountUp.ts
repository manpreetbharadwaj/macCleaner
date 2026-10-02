import { useEffect, useState } from 'react'

/** Animates 0 → target once `active` turns true. Respects reduced motion. */
export function useCountUp(target: number, active: boolean, durationMs = 1200, reduced = false): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!active) return
    if (reduced) {
      setValue(target)
      return
    }
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      setValue(target * (1 - Math.pow(1 - t, 3)))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, active, durationMs, reduced])
  return value
}
