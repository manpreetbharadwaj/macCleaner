import { Clock } from 'lucide-react'
import { Card, Reveal } from '@/components/ui/Card'
import { IconTile } from '@/components/ui/IconTile'
import { usePerformanceStore } from '../usePerformanceStore'
import { formatClock, uptimeParts } from '../format'
import { useTranslation } from 'react-i18next'
import { formatNumber } from '@/i18n/format'

export function UptimeCard({ delay = 0.2 }: { delay?: number }) {
  const { t } = useTranslation()
  const live = usePerformanceStore((s) => s.live)
  const up = live?.uptimeSecs != null ? uptimeParts(live.uptimeSecs) : null
  const units = up
    ? [
        { n: up.days, label: t('performance.uptimeUnits.days', { count: up.days }) },
        { n: up.hours, label: t('performance.uptimeUnits.hours', { count: up.hours }) },
        { n: up.minutes, label: t('performance.uptimeUnits.minutes', { count: up.minutes }) },
      ]
    : []
  return (
    <Reveal delay={delay}>
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <IconTile icon={Clock} color="#f5b400" size="md" />
          <p className="text-[13px] font-semibold text-ink-2">{t('performance.macUptime')}</p>
        </div>
        <div className="mt-4 flex gap-5">
          {up ? (
            units.map((u) => (
              <div key={u.label}>
                <p className="font-display text-[26px] leading-none font-bold tracking-[-0.03em] text-ink tabular">{formatNumber(u.n)}</p>
                <p className="mt-1 text-[11.5px] text-ink-3">{u.label}</p>
              </div>
            ))
          ) : (
            <p className="text-[13px] text-ink-3">{t('common.notAvailable')}</p>
          )}
        </div>
        {live?.bootTimeMs && <p className="mt-4 border-t border-line pt-3 text-[12px] text-ink-3">{t('performance.lastStarted', { when: formatClock(live.bootTimeMs) })}</p>}
      </Card>
    </Reveal>
  )
}
