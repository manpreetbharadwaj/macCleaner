import { useState } from 'react'
import { motion } from 'framer-motion'
import { BatteryCharging, Plug, RefreshCw, Zap } from 'lucide-react'
import { Card, Reveal, SectionTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { usePerformanceStore } from '../usePerformanceStore'
import { batteryConditionLabel, batteryConditionTone, formatMinutes, notAvailable } from '../format'
import { InfoTip, KeyValue, StatusChip } from './primitives'
import { useTranslation } from 'react-i18next'
import { formatNumber, formatPercentValue } from '@/i18n/format'

function BatteryGlyph({ percent, charging }: { percent: number | null; charging: boolean }) {
  const pct = percent ?? 0
  const color = pct <= 15 ? '#e5484d' : pct <= 30 ? '#ff8a4c' : '#19c39a'
  return (
    <div className="relative flex items-center" aria-hidden="true" dir="ltr">
      <div className="relative h-[92px] w-[176px] rounded-[22px] border-[5px] border-ink/80 p-[6px]">
        <motion.div
          className="h-full rounded-[13px]"
          style={{ background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 70%, #13b5e0))`, boxShadow: `0 0 24px -4px ${color}` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
        {charging && (
          <span className="absolute inset-0 flex items-center justify-center text-white drop-shadow">
            <Zap size={34} fill="currentColor" />
          </span>
        )}
      </div>
      <div className="ms-1 h-7 w-2.5 rounded-e-md bg-ink/80" />
    </div>
  )
}

/** Hidden entirely on Macs without a battery (the parent checks). */
export function BatteryHealth() {
  const { t } = useTranslation()
  const battery = usePerformanceStore((s) => s.battery)
  const refreshBattery = usePerformanceStore((s) => s.refreshBattery)
  const [refreshing, setRefreshing] = useState(false)
  if (!battery) return null

  const tone = batteryConditionTone(battery.condition)
  const charging = battery.isCharging ? t('performance.battery.charging') : battery.fullyCharged ? t('performance.battery.fullyCharged') : battery.onPowerAdapter ? t('performance.battery.notCharging') : t('common.no')
  const time = battery.minutesToFull !== null ? t('performance.battery.untilFull', { time: formatMinutes(battery.minutesToFull) }) : battery.minutesToEmpty !== null ? t('performance.battery.remaining', { time: formatMinutes(battery.minutesToEmpty) }) : null
  const cyclePct = battery.cycleCount !== null && battery.designCycleCount ? Math.min(100, (battery.cycleCount / battery.designCycleCount) * 100) : null

  return (
    <div className="space-y-6">
      <Reveal>
        <Card className="flex flex-wrap items-center gap-8 p-7">
          <BatteryGlyph percent={battery.percent} charging={battery.isCharging} />
          <div className="min-w-0 flex-1">
            <p className="font-display text-[44px] leading-none font-bold tracking-[-0.04em] text-ink tabular">{battery.percent !== null ? formatPercentValue(battery.percent) : notAvailable()}</p>
            <p className="mt-2 flex items-center gap-2 text-[13.5px] text-ink-2">
              {battery.onPowerAdapter ? <Plug size={15} /> : <BatteryCharging size={15} />}
              {battery.onPowerAdapter ? t('performance.battery.powerAdapter') : t('performance.battery.batteryPower')}
              {time && <span className="text-ink-3">· {time}</span>}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusChip tone={tone === 'good' ? 'good' : tone === 'warn' ? 'warn' : 'neutral'} className="!px-3.5 !py-1.5 !text-[13px]">
              {t('performance.battery.conditionIs', { condition: batteryConditionLabel(battery.condition) })}
            </StatusChip>
            <Button
              variant="ghost"
              size="sm"
              disabled={refreshing}
              onClick={async () => {
                setRefreshing(true)
                await refreshBattery(true)
                setRefreshing(false)
              }}
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> {t('common.refresh')}
            </Button>
          </div>
        </Card>
      </Reveal>

      <div className="grid gap-6 xl:grid-cols-2">
        <Reveal delay={0.06}>
          <Card className="h-full p-6">
            <p className="flex items-center gap-1 text-[13px] font-semibold text-ink-2">
              {t('performance.battery.maxCapacity')}
              <InfoTip label={t('performance.battery.maxCapacity')}>{t('performance.battery.maxCapacityTip')}</InfoTip>
            </p>
            <p className="mt-1 font-display text-[36px] leading-none font-bold tracking-[-0.03em] text-ink tabular">{battery.maximumCapacityPercent !== null ? formatPercentValue(battery.maximumCapacityPercent) : notAvailable()}</p>
            {battery.maximumCapacityPercent !== null && (
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface-3">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-[#19c39a] to-[#13b5e0]" initial={{ width: 0 }} animate={{ width: `${battery.maximumCapacityPercent}%` }} transition={{ duration: 1 }} />
              </div>
            )}
            <p className="mt-3 text-[12px] text-ink-3">{t('performance.battery.capacityNote')}</p>
          </Card>
        </Reveal>
        <Reveal delay={0.1}>
          <Card className="h-full p-6">
            <p className="flex items-center gap-1 text-[13px] font-semibold text-ink-2">{t('performance.battery.cycleCount')}</p>
            <p className="mt-1 font-display text-[36px] leading-none font-bold tracking-[-0.03em] text-ink tabular">{battery.cycleCount !== null ? formatNumber(battery.cycleCount) : notAvailable()}</p>
            {cyclePct !== null && (
              <>
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface-3">
                  <motion.div className="h-full rounded-full brand-gradient" initial={{ width: 0 }} animate={{ width: `${cyclePct}%` }} transition={{ duration: 1 }} />
                </div>
                <p className="mt-2 text-[12px] text-ink-2">
                  {t('performance.battery.cyclesOfDesign', { cycles: formatNumber(battery.cycleCount!), design: formatNumber(battery.designCycleCount!) })}
                </p>
              </>
            )}
            <p className="mt-3 text-[12px] text-ink-3">{t('performance.battery.cycleExplain')}</p>
          </Card>
        </Reveal>
      </div>

      <Reveal delay={0.14}>
        <SectionTitle title={t('performance.battery.details')} />
        <Card className="divide-y divide-line">
          <KeyValue label={t('performance.battery.charge')} value={battery.percent !== null ? formatPercentValue(battery.percent) : notAvailable()} />
          <KeyValue label={t('performance.battery.chargingLabel')} value={charging} />
          <KeyValue label={t('performance.battery.powerSource')} value={battery.onPowerAdapter ? t('performance.battery.powerAdapter') : t('performance.tabs.battery')} />
          <KeyValue label={t('performance.battery.timeRemaining')} value={time ?? (battery.onPowerAdapter ? t('performance.battery.notApplicable') : t('performance.battery.calculating'))} tip={t('performance.battery.timeTip')} />
          <KeyValue label={t('performance.battery.condition')} value={batteryConditionLabel(battery.condition)} tip={t('performance.battery.conditionTip')} />
          <KeyValue label={t('performance.battery.designCapacity')} value={battery.designCapacityMah ? t('performance.battery.mah', { value: formatNumber(battery.designCapacityMah) }) : notAvailable()} tip={t('performance.battery.designCapacityTip')} />
          <KeyValue label={t('performance.battery.fullCapacity')} value={battery.fullChargeCapacityMah ? t('performance.battery.mah', { value: formatNumber(battery.fullChargeCapacityMah) }) : notAvailable()} tip={t('performance.battery.fullCapacityTip')} />
          <KeyValue label={t('performance.battery.currentCharge')} value={battery.currentCapacityMah ? t('performance.battery.mah', { value: formatNumber(battery.currentCapacityMah) }) : notAvailable()} />
        </Card>
      </Reveal>
    </div>
  )
}
