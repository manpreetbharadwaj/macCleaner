import { Cpu, ExternalLink, Laptop, MonitorSmartphone, Sparkles } from 'lucide-react'
import { Card, Reveal, SectionTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAppStore } from '@/store/useAppStore'
import { formatBytes, formatDateTime } from '@/lib/format'
import { performanceService } from '../performanceService'
import { usePerformanceStore } from '../usePerformanceStore'
import { formatMemory , notAvailable, orNA } from '../format'
import { KeyValue, Skeleton, StatusChip } from './primitives'
import { UptimeCard } from './UptimeCard'
import { useTranslation } from 'react-i18next'

export function MacOSCard() {
  const { t } = useTranslation()
  const info = usePerformanceStore((s) => s.systemInfo)
  const update = usePerformanceStore((s) => s.updateStatus)
  const os = info?.os
  return (
    <Reveal delay={0.08}>
      <SectionTitle title="macOS" />
      <Card className="overflow-hidden">
        <div className="flex items-center gap-4 border-b border-line p-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-[14px] brand-gradient text-white shadow-[var(--shadow-glow)]">
            <Sparkles size={22} />
          </span>
          <div className="flex-1">
            <p className="font-display text-[19px] font-bold tracking-[-0.02em] text-ink">{os ? os.name : <Skeleton className="h-6 w-32" />}</p>
            <p className="text-[12.5px] text-ink-3">{os?.version ? `${t('apps.version', { version: os.version })}${os.build ? ` (${os.build})` : ''}` : ''}</p>
          </div>
          {update && (
            <StatusChip tone={update.state === 'update-available' ? 'info' : update.state === 'up-to-date' ? 'good' : 'neutral'}>
              {update.state === 'update-available' ? t('performance.os.updateAvailable') : update.state === 'up-to-date' ? t('performance.os.upToDate') : t('performance.os.statusUnknown')}
            </StatusChip>
          )}
        </div>
        <div className="divide-y divide-line">
          <KeyValue label={t('performance.os.version')} value={orNA(os?.version)} />
          <KeyValue label={t('performance.os.build')} value={orNA(os?.build)} />
          <KeyValue label={t('performance.os.architecture')} value={info ? (info.appleSilicon ? t('performance.os.appleSilicon') : t('performance.os.intel')) : '—'} />
          <KeyValue label={t('performance.os.kernel')} value={orNA(os?.kernel)} tip={t('performance.os.kernelTip')} />
        </div>
        <div className="border-t border-line bg-surface-2/50 p-5">
          {update?.state === 'update-available' ? (
            <>
              <p className="text-[13px] font-semibold text-ink">{t('performance.os.availableFromApple')}</p>
              <ul className="mt-1 space-y-0.5 text-[12.5px] text-ink-2">
                {update.macosUpdates.map((u) => (
                  <li key={u.name}>• {u.name}</li>
                ))}
                {update.otherUpdates.map((u) => (
                  <li key={u.name}>
                    • {u.name}
                    {u.version ? ` ${u.version}` : ''}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-[12.5px] text-ink-2">{update?.state === 'up-to-date' ? t('performance.os.noUpdatesFound') : t('performance.os.openToCheck')}</p>
          )}
          {update?.lastCheckedMs && <p className="mt-1 text-[11.5px] text-ink-3">{t('performance.os.lastChecked', { when: formatDateTime(new Date(update.lastCheckedMs).toISOString()) })}</p>}
          <Button className="mt-3" variant="secondary" size="sm" onClick={() => void performanceService.openSoftwareUpdate()}>
            <ExternalLink size={13} /> {update?.state === 'unknown' ? t('performance.os.checkUpdates') : t('performance.os.openSoftwareUpdate')}
          </Button>
        </div>
      </Card>
    </Reveal>
  )
}

export function MacInfo() {
  const { t } = useTranslation()
  const info = usePerformanceStore((s) => s.systemInfo)
  const disk = useAppStore((s) => s.diskSummary)
  const cores =
    info?.physicalCores != null
      ? info.performanceCores && info.efficiencyCores
        ? t('performance.mac.coresSplit', { count: info.physicalCores, performance: info.performanceCores, efficiency: info.efficiencyCores })
        : info.logicalCores && info.logicalCores !== info.physicalCores
          ? t('performance.mac.coresThreads', { count: info.physicalCores, threads: info.logicalCores })
          : t('performance.mac.cores', { count: info.physicalCores })
      : notAvailable()

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <Reveal>
          <SectionTitle title={t('performance.mac.hardware')} />
          <Card className="divide-y divide-line">
            <div className="flex items-center gap-3 p-5">
              <Laptop size={18} className="text-brand" />
              <p className="font-display text-[15px] font-bold text-ink">{info?.marketingName ?? info?.modelName ?? 'Mac'}</p>
            </div>
            <KeyValue label={t('performance.mac.model')} value={orNA(info?.modelName)} />
            <KeyValue label={t('performance.mac.modelId')} value={orNA(info?.modelIdentifier)} mono tip={t('performance.mac.modelIdTip')} />
            <KeyValue label={t('performance.mac.chip')} value={orNA(info?.chip)} />
            <KeyValue label={t('performance.cpu')} value={cores} />
            <KeyValue label={t('performance.mac.graphics')} value={info?.gpuName ? (info.gpuCores ? t('performance.mac.gpuCores', { gpu: info.gpuName, count: info.gpuCores }) : info.gpuName) : notAvailable()} />
            <KeyValue label={t('performance.memory')} value={info?.memoryBytes ? formatMemory(info.memoryBytes, 0) : notAvailable()} />
            <KeyValue label={t('nav.storage')} value={disk && disk.totalBytes > 0 ? t('performance.mac.storageValue', { total: formatBytes(disk.totalBytes), free: formatBytes(disk.freeBytes) }) : notAvailable()} />
            <KeyValue label={t('performance.mac.hostname')} value={orNA(info?.hostname)} mono tip={t('performance.mac.hostnameTip')} />
            {info?.translated && <KeyValue label={t('performance.mac.note')} value={t('performance.mac.rosetta')} />}
          </Card>
        </Reveal>
        {info && info.displays.length > 0 && (
          <Reveal delay={0.06}>
            <SectionTitle title={t('performance.mac.displays')} />
            <Card className="divide-y divide-line">
              {info.displays.map((d, i) => (
                <div key={`${d.name}-${i}`} className="flex items-center gap-3 px-5 py-3.5">
                  <MonitorSmartphone size={18} className="text-cyan" />
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-ink">
                      {d.name}
                      {d.builtIn && <span className="ms-2 text-[11.5px] font-medium text-ink-3">{t('performance.mac.builtIn')}</span>}
                      {d.main && <span className="ms-2 text-[11.5px] font-medium text-ink-3">{t('performance.mac.main')}</span>}
                    </p>
                    <p className="text-[12px] text-ink-3">
                      {d.resolution ? t('performance.mac.looksLike', { resolution: d.resolution.replace(/ x /g, ' × ') }) : notAvailable()}
                      {d.pixels ? ` · ${t('performance.mac.pixels', { pixels: d.pixels.replace(/ x /g, ' × ') })}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </Card>
          </Reveal>
        )}
      </div>
      <div className="space-y-6">
        <MacOSCard />
        <UptimeCard delay={0.12} />
        <Reveal delay={0.16}>
          <p className="flex items-start gap-2 px-1 text-[11.5px] leading-relaxed text-ink-3">
            <Cpu size={14} className="mt-0.5 shrink-0" /> {t('performance.mac.localNote')}
          </p>
        </Reveal>
      </div>
    </div>
  )
}
