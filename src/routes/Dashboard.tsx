import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, CalendarClock, Copy, Download, HardDrive, History, RefreshCw, Sparkles, Trash2, AppWindow, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, Reveal, SectionTitle } from '@/components/ui/Card'
import { progressLabel } from '@/i18n/progress'
import { formatPercentValue } from '@/i18n/format'
import { Button } from '@/components/ui/Button'
import { IconTile } from '@/components/ui/IconTile'
import { StorageRing } from '@/components/ui/StorageRing'
import { AnimatedBytes } from '@/components/ui/AnimatedNumber'
import { useAppStore } from '@/store/useAppStore'
import { BREAKDOWN_META, BREAKDOWN_ORDER } from '@/lib/meta'
import { formatBytes, formatDateTime, formatRelativeDate, greeting } from '@/lib/format'
import { buildSmartGroups, isOldDownload, sumBytes } from '@/lib/smartClean'

function Stat({ label, bytes, accent, delay }: { label: string; bytes: number; accent?: boolean; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay, duration: 0.45 }}>
      <p className="text-[12px] font-medium text-ink-3">{label}</p>
      <AnimatedBytes bytes={bytes} className={`font-display text-[26px] leading-tight font-bold tracking-[-0.02em] ${accent ? 'mint-text' : 'text-ink'}`} />
    </motion.div>
  )
}

function QuickTile({ to, icon, color, title, value, sub, delay }: { to: string; icon: LucideIcon; color: string; title: string; value: string; sub: string; delay: number }) {
  return (
    <Reveal delay={delay}>
      <Link to={to}>
        <Card interactive className="group flex h-full flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <IconTile icon={icon} color={color} size="sm" />
            <ArrowRight size={15} className="rtl-flip text-ink-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
          </div>
          <div>
            <p className="text-[12px] font-medium text-ink-3">{title}</p>
            <p className="font-display text-[19px] font-bold tracking-[-0.02em] text-ink">{value}</p>
            <p className="text-[11.5px] text-ink-3">{sub}</p>
          </div>
        </Card>
      </Link>
    </Reveal>
  )
}

export function Dashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const disk = useAppStore((s) => s.diskSummary)
  const hasScanned = useAppStore((s) => s.hasScanned)
  const scanning = useAppStore((s) => s.scanning)
  const scanProgress = useAppStore((s) => s.scanProgress)
  const breakdown = useAppStore((s) => s.breakdown)
  const items = useAppStore((s) => s.cleanupItems)
  const applications = useAppStore((s) => s.applications)
  const settings = useAppStore((s) => s.settings)
  const history = useAppStore((s) => s.history)
  const schedule = useAppStore((s) => s.schedule)
  const trashInfo = useAppStore((s) => s.trashInfo)
  const runScan = useAppStore((s) => s.runScan)

  const groups = useMemo(() => buildSmartGroups(items, applications, settings?.developerCleanupEnabled ?? true), [items, applications, settings?.developerCleanupEnabled])
  const potential = groups.reduce((s, g) => s + sumBytes(g.items), 0)
  const safeNow = groups.filter((g) => g.autoSelect).reduce((s, g) => s + sumBytes(g.items.filter((i) => i.safety === 'green')), 0)

  const active = items.filter((i) => !i.excluded && i.safety !== 'red')
  const large = active.filter((i) => i.extension && i.sizeBytes >= 500e6)
  const oldDownloads = active.filter(isOldDownload)
  const dupGroups = new Map<string, number[]>()
  for (const i of active) if (i.duplicateGroup) dupGroups.set(i.duplicateGroup, [...(dupGroups.get(i.duplicateGroup) ?? []), i.sizeBytes])
  const dupWasted = [...dupGroups.values()].filter((g) => g.length > 1).reduce((s, g) => s + g.slice(1).reduce((a, b) => a + b, 0), 0)
  const leftovers = groups.find((g) => g.id === 'app-leftovers')

  const total = disk?.totalBytes ?? 0
  const segments = hasScanned
    ? BREAKDOWN_ORDER.map((id) => ({ id, value: breakdown.find((b) => b.id === id)?.bytes ?? 0, color: BREAKDOWN_META[id].color }))
    : [{ id: 'used', value: disk?.usedBytes ?? 0, color: '#6e5bff' }]
  const usedPct = total > 0 ? Math.round(((disk?.usedBytes ?? 0) / total) * 100) : 0
  const lastCleanup = history[0]

  return (
    <div className="space-y-6">
      <motion.header initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-[32px] leading-tight font-bold tracking-[-0.03em] text-ink">
            {greeting()} <span className="inline-block origin-[70%_70%] animate-[float_4s_ease-in-out_infinite]">👋</span>
          </h1>
          <p className="mt-1 text-[15px] text-ink-2">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          {disk?.lastScanAt && <span className="text-[12px] text-ink-3">{t('dashboard.scanned', { when: formatRelativeDate(disk.lastScanAt).toLocaleLowerCase() })}</span>}
          <Button variant="secondary" onClick={() => runScan()} disabled={scanning}>
            <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
            {scanning ? t('dashboard.scanning') : hasScanned ? t('common.rescan') : t('dashboard.scan')}
          </Button>
        </div>
      </motion.header>

      <div className="grid grid-cols-12 gap-5">
        {/* Storage overview */}
        <Reveal className="col-span-12 xl:col-span-7">
          <Card className="h-full p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-[16px] font-semibold text-ink">{t('dashboard.macStorage')}</h2>
                <p className="text-[12.5px] text-ink-3">Macintosh HD</p>
              </div>
              <Link to="/storage" className="flex items-center gap-1 text-[12.5px] font-semibold text-brand hover:underline">
                {t('dashboard.explore')} <ArrowRight size={13} className="rtl-flip" />
              </Link>
            </div>

            <div className="mt-4 flex items-center gap-8">
              <StorageRing segments={segments} total={total} size={230} thickness={20} loading={!disk}>
                <span className="text-[11.5px] font-semibold tracking-wide text-ink-3 uppercase">{t('dashboard.used')}</span>
                <AnimatedBytes bytes={disk?.usedBytes ?? 0} className="font-display text-[34px] leading-none font-bold tracking-[-0.03em] text-ink" />
                <span className="mt-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11.5px] font-semibold text-ink-2">{t('dashboard.percentFull', { percent: formatPercentValue(usedPct) })}</span>
              </StorageRing>

              <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-5">
                <Stat label={t('dashboard.total')} bytes={total} delay={0.1} />
                <Stat label={t('dashboard.used')} bytes={disk?.usedBytes ?? 0} delay={0.16} />
                <Stat label={t('dashboard.free')} bytes={disk?.freeBytes ?? 0} delay={0.22} />
                {hasScanned ? (
                  <Stat label={t('dashboard.potentialCleanup')} bytes={potential} accent delay={0.28} />
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }}>
                    <p className="text-[12px] font-medium text-ink-3">{t('dashboard.potentialCleanup')}</p>
                    {scanning ? <div className="skeleton mt-2 h-6 w-24" /> : <p className="mt-1 text-[13px] font-semibold text-brand">{t('dashboard.scanToFindOut')}</p>}
                  </motion.div>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-4 gap-x-4 gap-y-3 border-t border-line pt-5">
              {BREAKDOWN_ORDER.map((id, i) => {
                const meta = BREAKDOWN_META[id]
                const bytes = breakdown.find((b) => b.id === id)?.bytes ?? 0
                return (
                  <motion.div key={id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.04 }} className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <motion.span className="h-2 w-2 rounded-full" style={{ background: meta.color }} animate={{ scale: [1, 1.35, 1] }} transition={{ duration: 2.4, delay: i * 0.3, repeat: Infinity, repeatDelay: 3 }} />
                      <span className="truncate text-[11.5px] font-medium text-ink-2">{t(meta.label)}</span>
                    </div>
                    {hasScanned ? (
                      <p className="ps-3.5 text-[13px] font-semibold text-ink tabular">{formatBytes(bytes)}</p>
                    ) : (
                      <div className={`ms-3.5 mt-1 h-3.5 w-14 ${scanning ? 'skeleton' : 'rounded bg-surface-2'}`} />
                    )}
                  </motion.div>
                )
              })}
            </div>
          </Card>
        </Reveal>

        {/* Smart Clean hero */}
        <div className="col-span-12 flex flex-col gap-5 xl:col-span-5">
          <Reveal delay={0.08}>
            <div className="relative overflow-hidden rounded-[var(--radius-card)] brand-gradient p-6 text-white shadow-[0_24px_50px_-20px_rgba(91,108,255,0.7)]">
              <div className="absolute -top-16 -end-10 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
              <div className="absolute -bottom-20 start-10 h-44 w-44 rounded-full bg-[#3ef0c8]/30 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2 text-[12.5px] font-semibold text-white/85">
                  <Sparkles size={15} /> {t('nav.smartClean')}
                </div>
                {hasScanned && safeNow < 1e6 ? (
                  <>
                    <p className="mt-3 font-display text-[24px] leading-tight font-bold tracking-[-0.02em]">{t('dashboard.allCaughtUp')}</p>
                    <p className="mt-1.5 text-[13px] text-white/80">
                      {potential > 0 ? t('dashboard.waitingForReview', { size: formatBytes(potential) }) : t('dashboard.nothingToClean')}
                    </p>
                  </>
                ) : hasScanned ? (
                  <>
                    <p className="mt-3 text-[13px] text-white/80">{t('dashboard.readyToClean')}</p>
                    <AnimatedBytes bytes={safeNow} className="font-display text-[44px] leading-none font-bold tracking-[-0.03em]" />
                    <p className="mt-2 text-[12.5px] text-white/75">
                      {t('dashboard.moreWaiting', { size: formatBytes(potential - safeNow) })}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-3 font-display text-[24px] leading-tight font-bold tracking-[-0.02em]">{t('dashboard.findSafe')}</p>
                    <p className="mt-1.5 text-[13px] text-white/80">{scanning && scanProgress ? progressLabel(scanProgress) : t('dashboard.findSafeBody')}</p>
                  </>
                )}
                <button
                  onClick={() => navigate(hasScanned ? '/smart-clean' : '/smart-clean?autostart=1')}
                  className="mt-5 inline-flex h-11 items-center gap-2 rounded-[14px] bg-white px-5 text-[14px] font-semibold text-[#4b3fd8] shadow-[0_10px_24px_-10px_rgba(0,0,0,0.4)] transition-transform hover:scale-[1.03] active:scale-[0.98]"
                >
                  {hasScanned ? t('dashboard.reviewAndClean') : t('scanGate.scanButton')} <ArrowRight size={16} className="rtl-flip" />
                </button>
              </div>
            </div>
          </Reveal>

          <div className="grid flex-1 grid-cols-2 gap-4">
            <QuickTile to="/large-files" icon={HardDrive} color="#ff8a4c" title={t('nav.largeFiles')} value={hasScanned ? formatBytes(sumBytes(large)) : '—'} sub={hasScanned ? t('dashboard.tiles.largeFiles', { count: large.length, size: formatBytes(500e6, 0) }) : t('dashboard.tiles.notScanned')} delay={0.12} />
            <QuickTile to="/downloads" icon={Download} color="#13b5e0" title={t('dashboard.tiles.oldDownloadsTitle')} value={hasScanned ? formatBytes(sumBytes(oldDownloads)) : '—'} sub={hasScanned ? t('dashboard.tiles.oldDownloads', { count: oldDownloads.length }) : t('dashboard.tiles.notScanned')} delay={0.16} />
            <QuickTile to="/duplicates" icon={Copy} color="#f0508a" title={t('dashboard.tiles.duplicatesTitle')} value={hasScanned ? formatBytes(dupWasted) : '—'} sub={hasScanned ? t('dashboard.tiles.duplicates', { count: dupGroups.size }) : t('dashboard.tiles.notScanned')} delay={0.2} />
            <QuickTile to="/apps" icon={AppWindow} color="#8b5cf6" title={t('dashboard.tiles.appLeftoversTitle')} value={hasScanned ? formatBytes(leftovers ? sumBytes(leftovers.items) : 0) : '—'} sub={hasScanned ? t('dashboard.tiles.appsInstalled', { count: applications.length }) : t('dashboard.tiles.notScanned')} delay={0.24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <Reveal delay={0.18}>
          <Card className="h-full p-5">
            <SectionTitle title={t('dashboard.lastCleanup')} />
            {lastCleanup ? (
              <div className="flex items-center gap-3">
                <IconTile icon={History} color="#19c39a" />
                <div>
                  <p className="font-display text-[18px] font-bold text-ink">{formatBytes(lastCleanup.actualBytes)}</p>
                  <p className="text-[12px] text-ink-3">
                    {t('common.items', { count: lastCleanup.itemCount })} · {formatDateTime(lastCleanup.completedAt)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-ink-3">{t('dashboard.noCleanups')}</p>
            )}
          </Card>
        </Reveal>
        <Reveal delay={0.22}>
          <Card className="h-full p-5">
            <SectionTitle title={t('dashboard.trash')} />
            <div className="flex items-center gap-3">
              <IconTile icon={Trash2} color="#9aa0bd" />
              <div className="min-w-0">
                <p className="font-display text-[18px] font-bold text-ink">{trashInfo?.sizeBytes != null ? formatBytes(trashInfo.sizeBytes) : '—'}</p>
                <p className="text-[12px] text-ink-3">{trashInfo?.sizeBytes != null ? t('dashboard.trashEmpty') : t('dashboard.trashNeedsAccess')}</p>
              </div>
            </div>
          </Card>
        </Reveal>
        <Reveal delay={0.26}>
          <Link to="/schedule">
            <Card interactive className="h-full p-5">
              <SectionTitle title={t('dashboard.scheduledCleanup')} />
              <div className="flex items-center gap-3">
                <IconTile icon={CalendarClock} color="#f5b400" />
                <div>
                  <p className="font-display text-[18px] font-bold text-ink">{schedule?.enabled ? t(`schedule.frequency.${schedule.frequency}`) : t('common.off')}</p>
                  <p className="text-[12px] text-ink-3">{schedule?.enabled && schedule.nextRunAt ? t('dashboard.nextRun', { when: formatDateTime(schedule.nextRunAt) }) : t('dashboard.scheduleHint')}</p>
                </div>
              </div>
            </Card>
          </Link>
        </Reveal>
      </div>
    </div>
  )
}
