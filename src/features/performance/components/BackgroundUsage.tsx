import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { Card, SectionTitle } from '@/components/ui/Card'
import { useAppStore } from '@/store/useAppStore'
import { usePerformanceStore } from '../usePerformanceStore'
import type { ProcessEntry } from '../types'
import { formatDuration, formatMemory } from '../format'
import { ProcessIcon, StatusChip } from './primitives'
import { ProcessDetails } from './ProcessDetails'
import { formatPercentValue } from '@/i18n/format'

type Trend = 'up' | 'down' | 'flat'

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === 'up') return <ArrowUp size={12} className="text-sun" />
  if (trend === 'down') return <ArrowDown size={12} className="text-mint" />
  return <Minus size={12} className="text-ink-3" />
}

/**
 * Section C: the top 5 background (no Dock icon) resource consumers, with a
 * trend arrow against the previous poll and a highlight for anything over
 * the same thresholds the alert engine (alerts.ts) and Settings use — not a
 * second, separate definition of "unusually high."
 */
export function BackgroundUsage() {
  const { t } = useTranslation()
  const list = usePerformanceStore((s) => s.processes)
  const alerts = useAppStore((s) => s.settings?.performanceAlerts)
  const [openId, setOpenId] = useState<string | null>(null)
  // Previous sample's CPU readings, kept as state (not a ref) and updated
  // directly during render when `top` changes — React's documented pattern
  // for "remember something from the last render" without an effect.
  const [previousSample, setPreviousSample] = useState<{ top: ProcessEntry[]; cpu: Map<string, number> }>({ top: [], cpu: new Map() })

  const now = list?.sampledAtMs ?? 0
  const top = useMemo(() => {
    const background = list?.entries.filter((e) => e.kind === 'background') ?? []
    return [...background].sort((a, b) => (b.cpuPercent ?? 0) - (a.cpuPercent ?? 0) || (b.memoryBytes ?? 0) - (a.memoryBytes ?? 0)).slice(0, 5)
  }, [list])

  if (top !== previousSample.top) {
    const cpu = new Map(top.map((e) => [e.id, e.cpuPercent ?? 0]))
    setPreviousSample({ top, cpu })
  }
  const trends = new Map<string, Trend>(
    top.map((e) => {
      const prev = previousSample.cpu.get(e.id)
      const cur = e.cpuPercent ?? 0
      return [e.id, prev === undefined ? 'flat' : cur - prev > 1 ? 'up' : cur - prev < -1 ? 'down' : 'flat']
    }),
  )

  if (!list) return null

  const highMemBytes = (alerts?.highMemoryThresholdMb ?? 1024) * 1_000_000
  const highCpu = alerts?.backgroundCpuThreshold ?? 50
  const isHigh = (e: ProcessEntry) => (e.memoryBytes ?? 0) >= highMemBytes || (e.cpuPercent ?? 0) >= highCpu

  return (
    <div>
      <SectionTitle title={t('performance.background.title')} subtitle={t('performance.background.subtitle')} />
      <Card className="p-2">
        {top.length === 0 ? (
          <p className="px-3 py-8 text-center text-[13px] text-ink-3">{t('performance.background.none')}</p>
        ) : (
          top.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setOpenId(e.id)}
              className="grid w-full grid-cols-[minmax(0,1fr)_84px_90px] items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors hover:bg-surface-2"
            >
              <span className="flex min-w-0 items-center gap-3">
                <ProcessIcon name={e.name} bundlePath={e.bundlePath} />
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-semibold text-ink">{e.name}</span>
                    {isHigh(e) && <StatusChip tone="warn">{t('performance.background.highUsage')}</StatusChip>}
                  </span>
                  <span className="block truncate text-[11px] text-ink-3">
                    {e.startedAtMs ? t('performance.background.runningFor', { duration: formatDuration(now - e.startedAtMs) }) : '—'}
                  </span>
                </span>
              </span>
              <span className="flex items-center justify-end gap-1 text-[12.5px] font-semibold text-ink tabular">
                <TrendIcon trend={trends.get(e.id) ?? 'flat'} />
                {e.cpuPercent === null ? '—' : formatPercentValue(e.cpuPercent, 1)}
              </span>
              <span className="text-end text-[12.5px] font-semibold text-ink tabular">{e.memoryBytes === null ? '—' : formatMemory(e.memoryBytes)}</span>
            </button>
          ))
        )}
      </Card>
      <ProcessDetails id={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}
