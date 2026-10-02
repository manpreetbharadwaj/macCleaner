import { useEffect, useState } from 'react'
import { usePerformanceStore } from './usePerformanceStore'

/**
 * Drives every refresh on the Performance screen. Monitoring must never
 * become a performance problem itself, so:
 *
 * - Nothing polls unless the Performance screen is mounted (leaving the tab
 *   unmounts it, which clears every timer).
 * - Everything pauses while the window is hidden or minimized.
 * - Intervals stretch when the window is visible but not focused.
 * - The process list (the most expensive call) is only refreshed on the
 *   sub-tabs that show it; battery only on the ones that show battery.
 * - Static facts (model, chip, macOS version) are fetched once per session.
 */
const INTERVALS = {
  live: { focused: 2_000, background: 6_000 },
  processes: { focused: 3_000, background: 10_000 },
  battery: { focused: 30_000, background: 60_000 },
}

function useWindowActivity() {
  const [visible, setVisible] = useState(() => !document.hidden)
  const [focused, setFocused] = useState(() => document.hasFocus())
  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden)
    const onFocus = () => setFocused(true)
    const onBlur = () => setFocused(false)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', onBlur)
    }
  }, [])
  return { visible, focused }
}

function every(ms: number, fn: () => void): () => void {
  const id = window.setInterval(fn, ms)
  return () => window.clearInterval(id)
}

export function usePerformancePolling() {
  const tab = usePerformanceStore((s) => s.tab)
  const { visible, focused } = useWindowActivity()

  // One-time loads for this visit.
  useEffect(() => {
    const s = usePerformanceStore.getState()
    void s.loadSystemInfo()
    void s.refreshUpdateStatus()
    void s.refreshBattery()
  }, [])

  useEffect(() => {
    if (!visible) return
    const s = usePerformanceStore.getState()
    const speed = focused ? 'focused' : 'background'
    const wantsProcesses = tab === 'overview' || tab === 'apps'
    const wantsBattery = tab === 'overview' || tab === 'battery'

    void s.refreshLive()
    if (wantsProcesses) void s.refreshProcesses()

    const stops = [every(INTERVALS.live[speed], () => void usePerformanceStore.getState().refreshLive())]
    if (wantsProcesses) stops.push(every(INTERVALS.processes[speed], () => void usePerformanceStore.getState().refreshProcesses()))
    if (wantsBattery) stops.push(every(INTERVALS.battery[speed], () => void usePerformanceStore.getState().refreshBattery()))
    return () => stops.forEach((stop) => stop())
  }, [tab, visible, focused])
}
