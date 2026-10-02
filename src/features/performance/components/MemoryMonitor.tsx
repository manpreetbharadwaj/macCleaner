import { MemoryStick } from 'lucide-react'
import { Card, Reveal } from '@/components/ui/Card'
import { IconTile } from '@/components/ui/IconTile'
import { usePerformanceStore } from '../usePerformanceStore'
import { formatMemory, pressureLabel } from '../format'
import { InfoTip, LiveChart, StatusChip } from './primitives'
import { useTranslation } from 'react-i18next'

const COLOR = '#8b5cf6'

export function MemoryMonitor() {
  const { t } = useTranslation()
  const mem = usePerformanceStore((s) => s.live?.memory ?? null)
  const history = usePerformanceStore((s) => s.history)

  const parts = mem
    ? [
        { label: t('performance.memParts.app'), bytes: mem.appBytes, color: COLOR, tip: t('performance.memParts.appTip') },
        { label: t('performance.memParts.wired'), bytes: mem.wiredBytes, color: '#f0508a', tip: t('performance.memParts.wiredTip') },
        { label: t('performance.memParts.compressed'), bytes: mem.compressedBytes, color: '#ff8a4c', tip: t('performance.memParts.compressedTip') },
      ]
    : []

  return (
    <Reveal delay={0.14} className="h-full">
      <Card className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <IconTile icon={MemoryStick} color={COLOR} size="md" />
            <div>
              <p className="flex items-center gap-1 text-[13px] font-semibold text-ink-2">
                {t('performance.memoryUsed')}
                <InfoTip label={t('performance.memoryUsed')}>{t('performance.memoryUsedTip')}</InfoTip>
              </p>
              <p className="font-display text-[28px] leading-none font-bold tracking-[-0.03em] text-ink tabular">
                {mem ? formatMemory(mem.usedBytes) : '—'}
                {mem && <span className="text-[16px] font-semibold text-ink-3"> / {formatMemory(mem.totalBytes, 0)}</span>}
              </p>
            </div>
          </div>
          {mem?.pressure && (
            <span className="flex items-center gap-1">
              <StatusChip tone={mem.pressure === 'normal' ? 'good' : mem.pressure === 'warning' ? 'warn' : 'bad'}>{t('performance.pressureIs', { pressure: pressureLabel(mem.pressure) })}</StatusChip>
              <InfoTip label={t('performance.health.memoryDetail')}>{t('performance.pressureTip')}</InfoTip>
            </span>
          )}
        </div>

        <div className="mt-4">
          <LiveChart points={history} pick={(p) => p.memory} color={COLOR} label={t('performance.memoryChart')} />
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
          {mem && (
            <div className="flex h-full">
              {parts.map((p) => (
                <div key={p.label} className="h-full transition-[width] duration-700" style={{ width: `${(p.bytes / mem.totalBytes) * 100}%`, background: p.color }} />
              ))}
            </div>
          )}
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-[12px]">
          {parts.map((p) => (
            <div key={p.label}>
              <dt className="flex items-center gap-1 text-ink-3">
                <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                {p.label}
                <InfoTip label={p.label}>{p.tip}</InfoTip>
              </dt>
              <dd className="font-semibold text-ink tabular">{formatMemory(p.bytes)}</dd>
            </div>
          ))}
        </dl>
        <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-[12px]">
          <div>
            <dt className="text-ink-3">{t('performance.availableLabel')}</dt>
            <dd className="font-semibold text-ink tabular">{mem ? formatMemory(mem.availableBytes) : '—'}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-ink-3">
              {t('performance.memParts.cached')}
              <InfoTip label={t('performance.memParts.cached')}>{t('performance.memParts.cachedTip')}</InfoTip>
            </dt>
            <dd className="font-semibold text-ink tabular">{mem ? formatMemory(mem.cachedBytes) : '—'}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-ink-3">
              {t('performance.memParts.swap')}
              <InfoTip label={t('performance.memParts.swap')}>{t('performance.memParts.swapTip')}</InfoTip>
            </dt>
            <dd className="font-semibold text-ink tabular">
              {mem?.swapUsedBytes != null ? formatMemory(mem.swapUsedBytes) : t('common.notAvailable')}
              {mem?.swapTotalBytes ? <span className="font-medium text-ink-3"> {t('performance.ofTotal', { total: formatMemory(mem.swapTotalBytes) })}</span> : null}
            </dd>
          </div>
        </dl>
      </Card>
    </Reveal>
  )
}
