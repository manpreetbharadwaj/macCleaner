import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Lock, RefreshCw, ShieldCheck, Sparkles, Trash2, Undo2, Wifi } from 'lucide-react'
import { clsx } from 'clsx'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { IconTile } from '@/components/ui/IconTile'
import { AnimatedBytes } from '@/components/ui/AnimatedNumber'
import { EmptyState } from '@/components/ui/EmptyState'
import { FileRow } from '@/components/cleanup/FileRow'
import { useCleanupFlow } from '@/components/cleanup/CleanupFlow'
import { toFlowItems } from '@/components/cleanup/SelectionBar'
import { useAppStore } from '@/store/useAppStore'
import { buildSmartGroups, defaultSmartSelection, sumBytes, type SmartGroup } from '@/lib/smartClean'
import { formatBytes } from '@/lib/format'
import { Trans, useTranslation } from 'react-i18next'
import type { TKey } from '@/i18n'

const STAGES: TKey[] = [
  'smartClean.stages.caches',
  'smartClean.stages.temp',
  'smartClean.stages.leftovers',
  'smartClean.stages.downloads',
  'smartClean.stages.largeFiles',
  'smartClean.stages.reclaimable',
]

/** Native scan phase (src-tauri/src/commands.rs) → the furthest stage it justifies showing. */
const PHASE_STAGE: Record<string, number> = { overview: 0, developer: 1, browsers: 1, applications: 2, files: 3, finalizing: 5 }

type View = 'idle' | 'scanning' | 'results'

function ScanOrb({ scanning }: { scanning: boolean }) {
  return (
    <div className="relative h-56 w-56">
      {[0, 0.7, 1.4].map((d) => (
        <div key={d} className="animate-pulse-ring absolute inset-0 rounded-full brand-gradient opacity-30" style={{ animationDelay: `${d}s`, animationPlayState: scanning ? 'running' : 'running' }} />
      ))}
      <div className="absolute inset-3 rounded-full bg-[conic-gradient(from_0deg,#4f8bff,#8b5cf6,#3ef0c8,#13b5e0,#4f8bff)] opacity-90 blur-[2px]" />
      <div className="absolute inset-[18px] overflow-hidden rounded-full brand-gradient shadow-[inset_0_-20px_40px_rgba(30,10,90,0.35),0_30px_60px_-20px_rgba(91,108,255,0.8)]">
        {scanning && <div className="animate-sweep absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0.45)_50deg,transparent_90deg)]" />}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.45),transparent_55%)]" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center text-white">
        <motion.div animate={scanning ? { rotate: [0, 12, -8, 0], scale: [1, 1.12, 1] } : { scale: [1, 1.06, 1] }} transition={{ duration: scanning ? 1.6 : 3, repeat: Infinity }}>
          <Sparkles size={64} strokeWidth={1.7} />
        </motion.div>
      </div>
    </div>
  )
}

function GroupCard({ group, selected, setSelected, index }: { group: SmartGroup; selected: Set<string>; setSelected: (s: Set<string>) => void; index: number }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [limit, setLimit] = useState(30)
  const selectable = group.items.filter((i) => i.safety !== 'red')
  const chosen = selectable.filter((i) => selected.has(i.id))
  const all = chosen.length === selectable.length && selectable.length > 0
  const some = chosen.length > 0 && !all
  const reviewCount = group.items.filter((i) => i.safety === 'orange').length

  const toggleAll = (on: boolean) => {
    const next = new Set(selected)
    for (const i of selectable) if (on) next.add(i.id)
            else next.delete(i.id)
    setSelected(next)
  }
  const toggleOne = (id: string, on: boolean) => {
    const next = new Set(selected)
    if (on) next.add(id)
            else next.delete(id)
    setSelected(next)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + index * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
      <Card className={clsx('overflow-hidden transition-shadow', open && 'shadow-[var(--shadow-lift)]')}>
        <div className="flex cursor-default items-center gap-4 px-5 py-4" onClick={() => setOpen(!open)}>
          <Checkbox checked={all} indeterminate={some} onChange={toggleAll} label={t('smartClean.selectAllIn', { group: t(group.title) })} />
          <IconTile icon={group.icon} color={group.color} size="lg" solid />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-display text-[15.5px] font-semibold text-ink">{t(group.title)}</p>
              {!group.autoSelect && <span className="rounded-full bg-sun-soft px-2 py-0.5 text-[10.5px] font-bold text-sun">{t('smartClean.yourFiles')}</span>}
              {group.autoSelect && reviewCount > 0 && <span className="rounded-full bg-sun-soft px-2 py-0.5 text-[10.5px] font-bold text-sun">{t('smartClean.toReview', { count: reviewCount })}</span>}
            </div>
            <p className="truncate text-[12.5px] text-ink-3">{t(group.description)}</p>
          </div>
          <div className="text-end">
            <p className="font-display text-[18px] font-bold text-ink tabular">{formatBytes(sumBytes(group.items))}</p>
            <p className="text-[11.5px] text-ink-3">
              {t('smartClean.selectedOf', { selected: chosen.length, count: group.items.length })}
            </p>
          </div>
          <motion.div animate={{ rotate: open ? 180 : 0 }} className="text-ink-3">
            <ChevronDown size={18} />
          </motion.div>
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
              <div className="border-t border-line px-2 py-2">
                {group.items.slice(0, limit).map((item, i) => (
                  <FileRow key={item.id} item={item} index={i} checked={selected.has(item.id)} onToggle={(on) => toggleOne(item.id, on)} icon={group.icon} color={group.color} showExclude />
                ))}
                {group.items.length > limit && (
                  <button className="w-full py-2 text-[12.5px] font-semibold text-brand" onClick={() => setLimit(limit + 50)}>
                    {t('smartClean.showMore', { count: Math.min(50, group.items.length - limit) })}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}

export function SmartClean() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const hasScanned = useAppStore((s) => s.hasScanned)
  const scanning = useAppStore((s) => s.scanning)
  const scanProgress = useAppStore((s) => s.scanProgress)
  const scanSession = useAppStore((s) => s.scanSession)
  const items = useAppStore((s) => s.cleanupItems)
  const applications = useAppStore((s) => s.applications)
  const settings = useAppStore((s) => s.settings)
  const trashInfo = useAppStore((s) => s.trashInfo)
  const runScan = useAppStore((s) => s.runScan)
  const cleanItems = useAppStore((s) => s.cleanItems)
  const openTrash = useAppStore((s) => s.openTrash)
  const dataSource = useAppStore((s) => s.dataSource)
  const flow = useCleanupFlow()

  const [view, setView] = useState<View>(hasScanned && !scanning ? 'results' : scanning ? 'scanning' : 'idle')
  const [stage, setStage] = useState(0)
  const targetStage = useRef(0)
  const scanDone = useRef(false)

  const groups = useMemo(() => buildSmartGroups(items, applications, settings?.developerCleanupEnabled ?? true), [items, applications, settings?.developerCleanupEnabled])
  const [selected, setSelected] = useState<Set<string>>(() => defaultSmartSelection(groups))

  // Fresh scan → fresh default selection.
  useEffect(() => {
    setSelected(defaultSmartSelection(buildSmartGroups(useAppStore.getState().cleanupItems, useAppStore.getState().applications, useAppStore.getState().settings?.developerCleanupEnabled ?? true)))
  }, [scanSession?.id])

  // Drop selections for items that no longer exist (after a cleanup).
  useEffect(() => {
    const ids = new Set(items.map((i) => i.id))
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => ids.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [items])

  const startScan = async () => {
    setView('scanning')
    setStage(0)
    targetStage.current = 0
    scanDone.current = false
    const ok = await runScan()
    scanDone.current = true
    targetStage.current = STAGES.length
    if (!ok) setView(useAppStore.getState().hasScanned ? 'results' : 'idle')
  }

  // A scan started elsewhere (e.g. the automatic first scan) finishes without
  // going through startScan — notice it ending so this view can move on.
  const sawScanning = useRef(false)
  useEffect(() => {
    if (view !== 'scanning') {
      sawScanning.current = false
      return
    }
    if (scanning) sawScanning.current = true
    else if (sawScanning.current && !scanDone.current) {
      scanDone.current = true
      targetStage.current = STAGES.length
      if (!useAppStore.getState().hasScanned) setView('idle')
    }
  }, [scanning, view])

  // Real native phases push the target stage forward.
  useEffect(() => {
    if (!scanProgress) return
    targetStage.current = Math.max(targetStage.current, PHASE_STAGE[scanProgress.phase] ?? 0)
  }, [scanProgress])

  // The visible stage walks toward the target at a readable pace, and a
  // long "files" phase is allowed to advance one extra step on its own.
  useEffect(() => {
    if (view !== 'scanning') return
    const timer = setInterval(() => {
      setStage((s) => {
        const target = scanDone.current ? STAGES.length : Math.max(targetStage.current, s === 3 ? 4 : 0)
        if (s >= STAGES.length) {
          clearInterval(timer)
          setTimeout(() => setView('results'), 350)
          return s
        }
        return s < target ? s + 1 : s
      })
    }, scanDone.current ? 260 : 720)
    return () => clearInterval(timer)
  }, [view])

  useEffect(() => {
    if (params.get('autostart') === '1') {
      params.delete('autostart')
      setParams(params, { replace: true })
      void startScan()
    } else if (scanning && view === 'idle') {
      setView('scanning')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const total = groups.reduce((s, g) => s + sumBytes(g.items), 0)
  const selectedItems = items.filter((i) => selected.has(i.id))
  const selectedBytes = sumBytes(selectedItems)
  const safeBytes = groups.filter((g) => g.autoSelect).reduce((s, g) => s + sumBytes(g.items.filter((i) => i.safety === 'green')), 0)

  const clean = () =>
    flow.start({
      items: toFlowItems(selectedItems),
      run: (onProgress) => cleanItems([...selected], onProgress),
    })

  return (
    <div>
      {flow.element}
      <AnimatePresence mode="wait">
        {view === 'idle' && (
          <motion.div key="idle" className="flex min-h-[calc(100vh-180px)] flex-col items-center justify-center text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
            <ScanOrb scanning={false} />
            <h1 className="mt-10 font-display text-[36px] font-bold tracking-[-0.035em] text-ink">{t('nav.smartClean')}</h1>
            <p className="mt-2 max-w-md text-[15px] text-ink-2">{t('smartClean.intro')}</p>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="mt-8">
              <Button variant="primary" size="xl" onClick={startScan} className="px-12">
                <Sparkles size={19} /> {t('scanGate.scanButton')}
              </Button>
            </motion.div>
            <div className="mt-10 flex gap-6 text-[12.5px] text-ink-3">
              <span className="flex items-center gap-1.5"><Wifi size={14} className="text-mint" /> {t('smartClean.onDevice')}</span>
              <span className="flex items-center gap-1.5"><Undo2 size={14} className="text-mint" /> {t('smartClean.toTrash')}</span>
              <span className="flex items-center gap-1.5"><Lock size={14} className="text-mint" /> {t('smartClean.personalNeverPreselected')}</span>
            </div>
          </motion.div>
        )}

        {view === 'scanning' && (
          <motion.div key="scanning" className="flex min-h-[calc(100vh-180px)] items-center justify-center gap-16" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -10 }}>
            <ScanOrb scanning />
            <div className="w-[340px]">
              <p className="text-[12px] font-bold tracking-[0.12em] text-brand uppercase">{t('smartClean.scanningEyebrow')}</p>
              <h2 className="mt-1 font-display text-[26px] font-bold tracking-[-0.025em] text-ink">{t('smartClean.scanningTitle')}</h2>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
                <motion.div className="h-full rounded-full brand-gradient" animate={{ width: `${Math.max(6, (stage / STAGES.length) * 100)}%` }} transition={{ duration: 0.6 }} />
              </div>
              <ul className="mt-6 space-y-3">
                {STAGES.map((label, i) => {
                  const done = i < stage
                  const active = i === stage
                  return (
                    <motion.li key={label} className="flex items-center gap-3 text-[14px]" animate={{ opacity: done || active ? 1 : 0.4 }}>
                      <span className={clsx('flex h-6 w-6 items-center justify-center rounded-full transition-all duration-300', done ? 'bg-mint text-white' : active ? 'brand-gradient text-white' : 'bg-surface-3')}>
                        {done ? (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                            <Check size={14} strokeWidth={3} />
                          </motion.span>
                        ) : active ? (
                          <RefreshCw size={12} className="animate-spin" strokeWidth={2.6} />
                        ) : null}
                      </span>
                      <span className={clsx(done ? 'text-ink-2' : active ? 'font-semibold text-ink' : 'text-ink-3')}>{t(label)}</span>
                    </motion.li>
                  )
                })}
              </ul>
            </div>
          </motion.div>
        )}

        {view === 'results' && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-32">
            <motion.div className="mb-7 flex items-end justify-between gap-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div>
                <p className="text-[12px] font-bold tracking-[0.12em] text-brand uppercase">{t('smartClean.scanComplete')}</p>
                <h1 className="mt-1 font-display text-[34px] leading-tight font-bold tracking-[-0.035em] text-ink">
                  {t('smartClean.canFreeUp')} <AnimatedBytes bytes={total} className="brand-text" unitClassName="ms-1.5" />
                </h1>
                <p className="mt-1.5 text-[14px] text-ink-2">
                  <Trans i18nKey="smartClean.safeRightAway" values={{ size: formatBytes(safeBytes) }} components={{ b: <span className="font-semibold text-mint" /> }} />
                </p>
              </div>
              <Button variant="secondary" onClick={startScan}>
                <RefreshCw size={14} /> {t('common.scanAgain')}
              </Button>
            </motion.div>

            {groups.length === 0 ? (
              <Card>
                <EmptyState icon={ShieldCheck} color="#19c39a" title={t('smartClean.tidyTitle')} subtitle={t('smartClean.tidySubtitle')} />
              </Card>
            ) : (
              <div className="space-y-3">
                {groups.map((g, i) => (
                  <GroupCard key={g.id} group={g} index={i} selected={selected} setSelected={setSelected} />
                ))}
                {trashInfo?.sizeBytes != null && trashInfo.sizeBytes > 0 && (
                  <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + groups.length * 0.06 }}>
                    <Card className="flex items-center gap-4 px-5 py-4">
                      <div className="w-5" />
                      <IconTile icon={Trash2} color="#9aa0bd" size="lg" solid />
                      <div className="flex-1">
                        <p className="font-display text-[15.5px] font-semibold text-ink">{t('dashboard.trash')}</p>
                        <p className="text-[12.5px] text-ink-3">{t('smartClean.trashNote')}</p>
                      </div>
                      <p className="font-display text-[18px] font-bold text-ink tabular">{formatBytes(trashInfo.sizeBytes)}</p>
                      {dataSource === 'tauri' && (
                        <Button size="sm" variant="secondary" onClick={() => openTrash()}>
                          {t('common.open')}
                        </Button>
                      )}
                    </Card>
                  </motion.div>
                )}
              </div>
            )}

            {groups.length > 0 && (
              <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 30 }}
                className="pointer-events-none fixed end-0 bottom-6 start-[248px] z-30 flex justify-center px-6"
              >
                <div className="glass pointer-events-auto flex w-full max-w-[640px] items-center gap-4 rounded-[22px] border border-line py-3 pe-3 ps-6 shadow-[var(--shadow-lift)]">
                  <div className="flex-1">
                    <p className="text-[13.5px] font-semibold text-ink">{t('selectionBar.selected', { count: selected.size })}</p>
                    <p className="text-[12px] text-ink-3">{t('smartClean.restoreNote')}</p>
                  </div>
                  <Button variant="primary" size="lg" disabled={selected.size === 0 || flow.busy} onClick={clean} className="min-w-[180px]">
                    <Sparkles size={17} /> {t('smartClean.cleanSize', { size: formatBytes(selectedBytes) })}
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
