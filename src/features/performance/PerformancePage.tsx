import { Activity, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { usePerformancePolling } from './usePerformancePolling'
import { usePerformanceStore, type PerformanceTab } from './usePerformanceStore'
import { BatteryHealth } from './components/BatteryHealth'
import { CpuMonitor } from './components/CpuMonitor'
import { DeviceCard } from './components/DeviceCard'
import { HealthSummary } from './components/HealthSummary'
import { MacInfo } from './components/MacInfo'
import { MemoryMonitor } from './components/MemoryMonitor'
import { OverviewCards } from './components/OverviewCards'
import { RunningApps } from './components/RunningApps'
import { StorageHealth } from './components/StorageHealth'
import { UptimeCard } from './components/UptimeCard'
import { SectionTitle } from '@/components/ui/Card'
import { useTranslation } from 'react-i18next'
import { formatDateLocalized } from '@/i18n/format'

function LiveBadge() {
  const { t } = useTranslation()
  const sampledAt = usePerformanceStore((s) => s.live?.sampledAtMs)
  return (
    <span className="flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-[12px] font-semibold text-ink-2 shadow-[var(--shadow-card)]" title={sampledAt ? t('performance.updatedAt', { time: formatDateLocalized(sampledAt, { hour: 'numeric', minute: '2-digit', second: '2-digit' }) }) : undefined}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inset-0 animate-ping rounded-full bg-mint opacity-60" />
        <span className="relative h-2 w-2 rounded-full bg-mint" />
      </span>
      {t('performance.live')}
    </span>
  )
}

export function PerformancePage() {
  const { t } = useTranslation()
  usePerformancePolling()
  const tab = usePerformanceStore((s) => s.tab)
  const setTab = usePerformanceStore((s) => s.setTab)
  const battery = usePerformanceStore((s) => s.battery)
  const error = usePerformanceStore((s) => s.error)

  const refreshAll = () => {
    const s = usePerformanceStore.getState()
    void s.refreshLive()
    void s.refreshProcesses()
    void s.refreshBattery(true)
    void s.refreshUpdateStatus()
  }

  const tabs: { value: PerformanceTab; label: string }[] = [
    { value: 'overview', label: t('performance.tabs.overview') },
    { value: 'apps', label: t('performance.tabs.apps') },
    ...(battery ? [{ value: 'battery' as const, label: t('performance.tabs.battery') }] : []),
    { value: 'mac', label: t('performance.tabs.mac') },
  ]
  const current = tab === 'battery' && !battery ? 'overview' : tab

  return (
    <div>
      <PageHeader
        title={t('nav.performance')}
        subtitle={t('performance.subtitle')}
        icon={Activity}
        color="#f43f5e"
        actions={
          <>
            <LiveBadge />
            <Button variant="secondary" onClick={refreshAll}>
              <RefreshCw size={14} /> {t('common.refresh')}
            </Button>
          </>
        }
      />
      <Segmented className="mb-6" value={current} onChange={setTab} options={tabs} />
      {error && <p className="mb-4 rounded-xl bg-danger-soft px-4 py-2.5 text-[12.5px] text-danger">{t('performance.readError', { error })}</p>}

      {current === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <DeviceCard />
            <OverviewCards />
          </div>
          <HealthSummary />
          <div className="grid gap-6 xl:grid-cols-2">
            <CpuMonitor />
            <MemoryMonitor />
          </div>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <div>
              <SectionTitle title={t('performance.runningApps')} subtitle={t('performance.runningAppsSubtitle')} />
              <RunningApps compact onSeeAll={() => setTab('apps')} />
            </div>
            <div className="space-y-6">
              <StorageHealth />
              <UptimeCard />
            </div>
          </div>
        </div>
      )}
      {current === 'apps' && <RunningApps />}
      {current === 'battery' && <BatteryHealth />}
      {current === 'mac' && (
        <div className="space-y-6">
          <DeviceCard large />
          <MacInfo />
        </div>
      )}
    </div>
  )
}
