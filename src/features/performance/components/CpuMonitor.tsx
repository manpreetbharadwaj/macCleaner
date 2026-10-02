import { Cpu } from 'lucide-react'
import { Card, Reveal } from '@/components/ui/Card'
import { IconTile } from '@/components/ui/IconTile'
import { usePerformanceStore } from '../usePerformanceStore'
import { InfoTip, LiveChart } from './primitives'
import { useTranslation } from 'react-i18next'
import { formatPercentValue } from '@/i18n/format'

const COLOR = '#5b6cff'

export function CpuMonitor() {
  const { t } = useTranslation()
  const cpu = usePerformanceStore((s) => s.live?.cpu ?? null)
  const history = usePerformanceStore((s) => s.history)
  const info = usePerformanceStore((s) => s.systemInfo)

  const cores = info?.performanceCores && info.efficiencyCores ? t('performance.cpuCores.split', { performance: info.performanceCores, efficiency: info.efficiencyCores }) : (info?.physicalCores ?? cpu?.logicalCores ?? null)

  return (
    <Reveal delay={0.1} className="h-full">
      <Card className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <IconTile icon={Cpu} color={COLOR} size="md" />
            <div>
              <p className="flex items-center gap-1 text-[13px] font-semibold text-ink-2">
                {t('performance.cpuUsage')}
                <InfoTip label={t('performance.cpuUsage')}>{t('performance.cpuUsageTip')}</InfoTip>
              </p>
              <p className="font-display text-[28px] leading-none font-bold tracking-[-0.03em] text-ink tabular">{cpu ? formatPercentValue(cpu.total) : '—'}</p>
            </div>
          </div>
          {info?.chip && <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11.5px] font-semibold text-ink-2">{info.chip}</span>}
        </div>

        <div className="mt-4">
          <LiveChart points={history} pick={(p) => p.cpu} color={COLOR} label={t('performance.cpuChart')} />
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
          {cpu && (
            <div className="flex h-full">
              <div className="h-full transition-[width] duration-700" style={{ width: `${cpu.user}%`, background: COLOR }} />
              <div className="h-full transition-[width] duration-700" style={{ width: `${cpu.system}%`, background: '#f0508a' }} />
            </div>
          )}
        </div>
        <dl className="mt-3 grid grid-cols-4 gap-2 text-[12px]">
          {[
            { label: t('performance.cpuParts.user'), value: cpu?.user, color: COLOR, tip: t('performance.cpuParts.userTip') },
            { label: t('performance.cpuParts.system'), value: cpu?.system, color: '#f0508a', tip: t('performance.cpuParts.systemTip') },
            { label: t('performance.cpuParts.idle'), value: cpu?.idle, color: 'var(--color-surface-3)', tip: t('performance.cpuParts.idleTip') },
          ].map((s) => (
            <div key={s.label}>
              <dt className="flex items-center gap-1 text-ink-3">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.label}
                <InfoTip label={s.label}>{s.tip}</InfoTip>
              </dt>
              <dd className="font-semibold text-ink tabular">{s.value !== undefined ? formatPercentValue(s.value, 1) : '—'}</dd>
            </div>
          ))}
          <div>
            <dt className="text-ink-3">{t('performance.cpuCores.label')}</dt>
            <dd className="font-semibold text-ink tabular" title={typeof cores === 'string' ? cores : undefined}>
              {info?.physicalCores ?? cpu?.logicalCores ?? '—'}
            </dd>
          </div>
        </dl>
        {typeof cores === 'string' && <p className="mt-2 text-[11.5px] text-ink-3">{cores}</p>}
      </Card>
    </Reveal>
  )
}
