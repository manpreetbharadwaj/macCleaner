import type { ReactNode } from 'react'
import { BatteryCharging, Clock, Cpu, HardDrive, MemoryStick, type LucideIcon } from 'lucide-react'
import { Card, Reveal } from '@/components/ui/Card'
import { useAppStore } from '@/store/useAppStore'
import { formatBytesCompact } from '@/lib/format'
import { usePerformanceStore } from '../usePerformanceStore'
import { batteryConditionLabel, formatMemory , notAvailable, uptimeParts } from '../format'
import { Gauge } from './primitives'
import { useTranslation } from 'react-i18next'
import { formatPercentValue } from '@/i18n/format'

function MetricCard({ icon: Icon, color, title, value, sub, gauge, delay }: { icon: LucideIcon; color: string; title: string; value: ReactNode; sub: ReactNode; gauge: number | null; delay: number }) {
  return (
    <Reveal delay={delay}>
      <Card className="flex h-full items-center gap-4 p-4">
        <Gauge value={gauge} color={color} size={76} thickness={8}>
          <Icon size={22} strokeWidth={2.1} style={{ color }} aria-hidden="true" />
        </Gauge>
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-ink-3">{title}</p>
          <p className="font-display text-[18px] leading-tight font-bold tracking-[-0.02em] whitespace-nowrap text-ink tabular">{value}</p>
          <p className="truncate text-[11.5px] text-ink-3">{sub}</p>
        </div>
      </Card>
    </Reveal>
  )
}

export function OverviewCards() {
  const { t } = useTranslation()
  const live = usePerformanceStore((s) => s.live)
  const battery = usePerformanceStore((s) => s.battery)
  const disk = useAppStore((s) => s.diskSummary)
  const cpu = live?.cpu
  const mem = live?.memory
  const uptime = live?.uptimeSecs != null ? uptimeParts(live.uptimeSecs) : null

  return (
    <div className="grid h-full grid-cols-2 gap-4">
      <MetricCard icon={Cpu} color="#5b6cff" title={t('performance.cpu')} gauge={cpu?.total ?? null} value={cpu ? formatPercentValue(cpu.total) : '—'} sub={cpu ? t('performance.idlePercent', { percent: formatPercentValue(cpu.idle) }) : t('performance.measuring')} delay={0.02} />
      <MetricCard
        icon={MemoryStick}
        color="#8b5cf6"
        title={t('performance.memory')}
        gauge={mem ? (mem.usedBytes / mem.totalBytes) * 100 : null}
        value={mem ? `${formatMemory(mem.usedBytes)} / ${formatMemory(mem.totalBytes, 0)}` : '—'}
        sub={mem ? t('performance.available', { size: formatMemory(mem.availableBytes) }) : t('performance.measuring')}
        delay={0.06}
      />
      <MetricCard
        icon={HardDrive}
        color="#13b5e0"
        title={t('nav.storage')}
        gauge={disk && disk.totalBytes > 0 ? (disk.usedBytes / disk.totalBytes) * 100 : null}
        value={disk && disk.totalBytes > 0 ? `${formatBytesCompact(disk.usedBytes)} / ${formatBytesCompact(disk.totalBytes)}` : notAvailable()}
        sub={disk ? t('performance.available', { size: formatBytesCompact(disk.freeBytes) }) : ''}
        delay={0.1}
      />
      {battery ? (
        <MetricCard
          icon={BatteryCharging}
          color="#19c39a"
          title={t('performance.tabs.battery')}
          gauge={battery.percent}
          value={battery.percent !== null ? formatPercentValue(battery.percent) : notAvailable()}
          sub={battery.condition ? t('performance.battery.conditionIs', { condition: batteryConditionLabel(battery.condition) }) : battery.isCharging ? t('performance.battery.charging') : t('performance.battery.onBattery')}
          delay={0.14}
        />
      ) : (
        <MetricCard
          icon={Clock}
          color="#f5b400"
          title={t('performance.uptime')}
          gauge={null}
          value={uptime ? (uptime.days > 0 ? t('performance.duration.dh', { d: uptime.days, h: uptime.hours }) : t('performance.duration.hm', { h: uptime.hours, m: uptime.minutes })) : '—'}
          sub={t('performance.sinceRestart')}
          delay={0.14}
        />
      )}
    </div>
  )
}
