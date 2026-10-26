import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Cpu, MemoryStick, TrendingUp, type LucideIcon } from 'lucide-react'
import { Card, SectionTitle } from '@/components/ui/Card'
import { useAppStore } from '@/store/useAppStore'
import { usePerformanceStore } from '../usePerformanceStore'
import { formatMemory } from '../format'
import { formatPercentValue } from '@/i18n/format'

interface Recommendation {
  id: string
  icon: LucideIcon
  tone: 'warn' | 'info'
  text: string
}

/**
 * Section F: recommendations derived only from measured conditions already
 * on screen — never a promise that quitting an app frees a specific amount
 * of RAM, and never a fake one-click "optimize" action.
 */
export function Recommendations() {
  const { t } = useTranslation()
  const live = usePerformanceStore((s) => s.live)
  const processes = usePerformanceStore((s) => s.processes)
  const alerts = useAppStore((s) => s.settings?.performanceAlerts)

  const items = useMemo<Recommendation[]>(() => {
    const out: Recommendation[] = []
    if (!live || !processes) return out

    const pressure = live.memory?.pressure
    if (pressure === 'critical') out.push({ id: 'pressure', icon: AlertTriangle, tone: 'warn', text: t('performance.recommendations.criticalPressure') })
    else if (pressure === 'warning') out.push({ id: 'pressure', icon: AlertTriangle, tone: 'info', text: t('performance.recommendations.warningPressure') })

    const memThresholdBytes = (alerts?.highMemoryThresholdMb ?? 1024) * 1_000_000
    const heaviest = processes.entries
      .filter((e) => !e.isSelf && e.kind !== 'system' && (e.memoryBytes ?? 0) >= memThresholdBytes)
      .sort((a, b) => (b.memoryBytes ?? 0) - (a.memoryBytes ?? 0))[0]
    if (heaviest) {
      out.push({ id: `mem-${heaviest.id}`, icon: MemoryStick, tone: 'info', text: t('performance.recommendations.highMemory', { app: heaviest.name, size: formatMemory(heaviest.memoryBytes ?? 0) }) })
    }

    const cpuThreshold = alerts?.backgroundCpuThreshold ?? 50
    const busyBackground = processes.entries.filter((e) => e.kind === 'background' && (e.cpuPercent ?? 0) >= cpuThreshold)
    if (busyBackground.length >= 2) {
      out.push({ id: 'bg-cpu', icon: Cpu, tone: 'info', text: t('performance.recommendations.backgroundCpu', { count: busyBackground.length }) })
    }

    const swapTotal = live.memory?.swapTotalBytes ?? 0
    const swapUsed = live.memory?.swapUsedBytes ?? 0
    if (swapTotal > 0 && swapUsed / swapTotal >= 0.1) {
      out.push({ id: 'swap', icon: TrendingUp, tone: 'info', text: t('performance.recommendations.swap', { percent: formatPercentValue((swapUsed / swapTotal) * 100, 0) }) })
    }

    return out
  }, [live, processes, alerts, t])

  if (items.length === 0) return null

  return (
    <div>
      <SectionTitle title={t('performance.recommendations.title')} subtitle={t('performance.recommendations.subtitle')} />
      <Card className="divide-y divide-line p-2">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.id} className="flex items-start gap-3 px-3 py-3">
              <Icon size={16} className={item.tone === 'warn' ? 'mt-0.5 shrink-0 text-danger' : 'mt-0.5 shrink-0 text-brand'} />
              <p className="text-[13px] leading-relaxed text-ink-2">{item.text}</p>
            </div>
          )
        })}
      </Card>
    </div>
  )
}
