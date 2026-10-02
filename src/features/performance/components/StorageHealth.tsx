import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, HardDrive, Sparkles } from 'lucide-react'
import { Card, Reveal } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { IconTile } from '@/components/ui/IconTile'
import { useAppStore } from '@/store/useAppStore'
import { formatBytes } from '@/lib/format'
import { buildSmartGroups, sumBytes } from '@/lib/smartClean'
import { useTranslation } from 'react-i18next'

/**
 * Storage at a glance, reusing the cleaner's own disk summary and scan
 * results — the Performance tab never re-scans or duplicates cleaning.
 */
export function StorageHealth() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const disk = useAppStore((s) => s.diskSummary)
  const hasScanned = useAppStore((s) => s.hasScanned)
  const items = useAppStore((s) => s.cleanupItems)
  const applications = useAppStore((s) => s.applications)
  const devEnabled = useAppStore((s) => s.settings?.developerCleanupEnabled ?? true)
  const recoverable = useMemo(() => buildSmartGroups(items, applications, devEnabled).reduce((s, g) => s + sumBytes(g.items), 0), [items, applications, devEnabled])
  const usedPct = disk && disk.totalBytes > 0 ? (disk.usedBytes / disk.totalBytes) * 100 : 0
  const recPct = disk && disk.totalBytes > 0 && hasScanned ? Math.min(usedPct, (recoverable / disk.totalBytes) * 100) : 0

  return (
    <Reveal delay={0.16}>
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <IconTile icon={HardDrive} color="#13b5e0" size="md" />
          <div>
            <p className="text-[13px] font-semibold text-ink-2">{t('nav.storage')}</p>
            <p className="font-display text-[19px] font-bold tracking-[-0.02em] text-ink">{disk ? t('performance.available', { size: formatBytes(disk.freeBytes) }) : t('common.notAvailable')}</p>
          </div>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
          <div className="flex h-full">
            <div className="h-full brand-gradient" style={{ width: `${usedPct - recPct}%` }} />
            <div className="h-full bg-mint" style={{ width: `${recPct}%` }} />
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
          <dt className="text-ink-3">{t('dashboard.total')}</dt>
          <dd className="text-end font-semibold text-ink tabular">{disk ? formatBytes(disk.totalBytes) : '—'}</dd>
          <dt className="text-ink-3">{t('dashboard.used')}</dt>
          <dd className="text-end font-semibold text-ink tabular">{disk ? formatBytes(disk.usedBytes) : '—'}</dd>
          <dt className="flex items-center gap-1.5 text-ink-3">
            <span className="h-2 w-2 rounded-full bg-mint" />
            {t('performance.storage.recoverable')}
          </dt>
          <dd className="text-end font-semibold text-ink tabular">{hasScanned ? formatBytes(recoverable) : t('performance.storage.runScan')}</dd>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={() => navigate('/smart-clean')}>
            <Sparkles size={14} /> {t('performance.storage.openCleaner')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/storage')}>
            {t('performance.storage.breakdown')} <ArrowRight size={14} className="rtl-flip" />
          </Button>
        </div>
      </Card>
    </Reveal>
  )
}
