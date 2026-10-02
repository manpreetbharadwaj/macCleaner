import type { ReactNode } from 'react'
import { BatteryMedium, Clock, Cpu, HardDrive, MemoryStick, Monitor, type LucideIcon } from 'lucide-react'
import { Card, Reveal, SectionTitle } from '@/components/ui/Card'
import { useAppStore } from '@/store/useAppStore'
import { formatBytesCompact } from '@/lib/format'
import { usePerformanceStore } from '../usePerformanceStore'
import { batteryConditionLabel, batteryConditionTone, pressureLabel, uptimeParts } from '../format'
import { InfoTip, StatusChip, type Tone } from './primitives'
import { useTranslation } from 'react-i18next'
import { formatPercentValue } from '@/i18n/format'

function Tile({ icon: Icon, color, label, status, tone, detail, tip }: { icon: LucideIcon; color: string; label: string; status: string; tone: Tone; detail: string; tip: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface-2/60 p-3.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-2">
          <Icon size={14} style={{ color }} /> {label}
        </span>
        <InfoTip label={label}>{tip}</InfoTip>
      </div>
      <StatusChip tone={tone} className="self-start">
        {status}
      </StatusChip>
      <p className="text-[11.5px] leading-snug text-ink-3">{detail}</p>
    </div>
  )
}

/**
 * Descriptive statuses only — no invented overall "health score". Each tile
 * says where its verdict comes from.
 */
export function HealthSummary() {
  const { t } = useTranslation()
  const live = usePerformanceStore((s) => s.live)
  const battery = usePerformanceStore((s) => s.battery)
  const update = usePerformanceStore((s) => s.updateStatus)
  const disk = useAppStore((s) => s.diskSummary)

  const pressure = live?.memory?.pressure ?? null
  const cpu = live?.cpu?.total ?? null
  const freePct = disk && disk.totalBytes > 0 ? (disk.freeBytes / disk.totalBytes) * 100 : null
  const up = live?.uptimeSecs != null ? uptimeParts(live.uptimeSecs) : null

  return (
    <Reveal delay={0.08}>
      <SectionTitle title={t('performance.health.title')} subtitle={t('performance.health.subtitle')} />
      <Card className="grid grid-cols-2 gap-3 p-3 lg:grid-cols-3 xl:grid-cols-6">
        <Tile
          icon={MemoryStick}
          color="#8b5cf6"
          label={t('performance.memory')}
          status={pressure ? pressureLabel(pressure) : t('performance.checking')}
          tone={pressure === 'normal' ? 'good' : pressure === 'warning' ? 'warn' : pressure === 'critical' ? 'bad' : 'neutral'}
          detail={t('performance.health.memoryDetail')}
          tip={t('performance.health.memoryTip')}
        />
        <Tile
          icon={HardDrive}
          color="#13b5e0"
          label={t('nav.storage')}
          status={disk ? t('performance.health.storageFree', { size: formatBytesCompact(disk.freeBytes) }) : '—'}
          tone={freePct === null ? 'neutral' : freePct < 10 ? 'bad' : freePct < 20 ? 'warn' : 'good'}
          detail={freePct === null ? '' : freePct < 10 ? t('performance.health.runningLow') : freePct < 20 ? t('performance.health.gettingFull') : t('performance.health.plentyOfRoom')}
          tip={t('performance.health.storageTip', { full: formatPercentValue(20), low: formatPercentValue(10) })}
        />
        <Tile
          icon={BatteryMedium}
          color="#19c39a"
          label={t('performance.tabs.battery')}
          status={battery === undefined ? t('performance.checking') : battery === null ? t('performance.health.noBattery') : batteryConditionLabel(battery.condition)}
          tone={battery ? (batteryConditionTone(battery.condition) === 'good' ? 'good' : batteryConditionTone(battery.condition) === 'warn' ? 'warn' : 'neutral') : 'neutral'}
          detail={battery ? t('performance.health.batteryDetail') : t('performance.health.desktopMac')}
          tip={t('performance.health.batteryTip')}
        />
        <Tile
          icon={Cpu}
          color="#5b6cff"
          label={t('performance.cpu')}
          status={cpu === null ? t('performance.measuring') : t('performance.health.cpuInUse', { percent: formatPercentValue(cpu) })}
          tone={cpu === null ? 'neutral' : cpu >= 85 ? 'warn' : 'good'}
          detail={cpu === null ? '' : cpu < 30 ? t('performance.health.light') : cpu < 85 ? t('performance.health.moderate') : t('performance.health.busy')}
          tip={t('performance.health.cpuTip')}
        />
        <Tile
          icon={Clock}
          color="#f5b400"
          label={t('performance.uptime')}
          status={up ? (up.days > 0 ? t('performance.duration.dh', { d: up.days, h: up.hours }) : t('performance.duration.hm', { h: up.hours, m: up.minutes })) : '—'}
          tone="neutral"
          detail={t('performance.sinceRestart')}
          tip={t('performance.health.uptimeTip')}
        />
        <Tile
          icon={Monitor}
          color="#6e5bff"
          label="macOS"
          status={!update ? t('performance.checking') : update.state === 'update-available' ? t('performance.os.updateAvailable') : update.state === 'up-to-date' ? t('performance.os.upToDate') : t('common.unknown')}
          tone={!update ? 'neutral' : update.state === 'update-available' ? 'info' : update.state === 'up-to-date' ? 'good' : 'neutral'}
          detail={update?.state === 'update-available' ? (update.macosUpdates[0]?.name ?? '') : update?.state === 'up-to-date' ? t('performance.health.asOfLastCheck') : t('performance.health.checkInSettings')}
          tip={t('performance.health.macosTip')}
        />
      </Card>
    </Reveal>
  )
}
