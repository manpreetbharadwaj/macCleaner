import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AppWindow, Brush, FolderSearch, Info, Lock, Search, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button, IconButton } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Segmented } from '@/components/ui/Segmented'
import { SafetyPill } from '@/components/ui/SafetyPill'
import { AppIcon } from '@/components/ui/AppIcon'
import { AnimatedBytes } from '@/components/ui/AnimatedNumber'
import { EmptyState } from '@/components/ui/EmptyState'
import { useCleanupFlow, type FlowItem } from '@/components/cleanup/CleanupFlow'
import { ScanGate } from '@/components/ScanGate'
import { useAppStore } from '@/store/useAppStore'
import { formatBytes, formatRelativeDate, tildePath } from '@/lib/format'
import type { AppFootprint, ApplicationItem, TrashTarget } from '@/types'
import { useTranslation } from 'react-i18next'
import { footprintLabel } from '@/i18n/nativeText'

const KIND_COLOR: Record<string, string> = {
  cache: '#19c39a',
  logs: '#4f7bff',
  'saved-state': '#13b5e0',
  'web-data': '#f5b400',
  support: '#8b5cf6',
  preferences: '#f0508a',
  container: '#ff8a4c',
}

function isSystem(app: ApplicationItem) {
  return (app.bundleId ?? '').toLowerCase().startsWith('com.apple.')
}

function footprintTotal(app: ApplicationItem, fp?: AppFootprint) {
  return app.sizeBytes + (fp ? fp.items.reduce((s, i) => s + i.sizeBytes, 0) : 0)
}

type Flow = ReturnType<typeof useCleanupFlow>

function AppDetail({ app, footprint, flow, onUninstalled }: { app: ApplicationItem; footprint: AppFootprint | undefined; flow: Flow; onUninstalled: () => void }) {
  const { t } = useTranslation()
  const reveal = useAppStore((s) => s.revealInFinder)
  const trashTargets = useAppStore((s) => s.trashTargets)
  const uninstallApp = useAppStore((s) => s.uninstallApp)
  const loadAppFootprint = useAppStore((s) => s.loadAppFootprint)
  const items = footprint?.items ?? []
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const system = footprint?.isSystemApp ?? isSystem(app)

  useEffect(() => {
    setPicked(new Set(items.filter((i) => i.safety === 'green').map((i) => i.path)))
  }, [footprint]) // eslint-disable-line react-hooks/exhaustive-deps

  const toTargets = (paths: Set<string> | null): TrashTarget[] =>
    items.filter((i) => !paths || paths.has(i.path)).map((i) => ({ id: i.path, name: `${app.name} — ${footprintLabel(i.label)}`, path: i.path, sizeBytes: i.sizeBytes, safety: i.safety }))
  const toFlow = (targets: TrashTarget[]): FlowItem[] => targets.map((t) => ({ ...t, personal: t.safety !== 'green' }))

  const cleanData = () => {
    const targets = toTargets(picked)
    flow.start({
      items: toFlow(targets),
      doneTitle: t('apps.cleanedUp', { app: app.name }),
      run: () => trashTargets(targets),
      onDone: () => void loadAppFootprint(app, true),
    })
  }

  const uninstall = () => {
    const leftovers = toTargets(null)
    flow.start({
      items: [{ id: app.path, name: `${app.name}.app`, path: app.path, sizeBytes: app.sizeBytes, safety: 'orange', personal: true }, ...toFlow(leftovers)],
      doneTitle: t('apps.uninstalled', { app: app.name }),
      run: () => uninstallApp(app, leftovers),
      onDone: (o) => o.successCount > 0 && onUninstalled(),
    })
  }

  const rows = [{ key: 'app', label: t('apps.application'), path: app.path, sizeBytes: app.sizeBytes, color: '#8b5cf6', safety: null as null | 'green' | 'orange' }, ...items.map((i) => ({ key: i.path, label: footprintLabel(i.label), path: i.path, sizeBytes: i.sizeBytes, color: KIND_COLOR[i.kind] ?? '#9aa0bd', safety: i.safety as 'green' | 'orange' }))]
  const total = footprintTotal(app, footprint)

  return (
    <motion.div key={app.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="flex h-full flex-col">
      <div className="flex items-center gap-4 border-b border-line p-6">
        <AppIcon app={app} size={68} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-[22px] font-bold tracking-[-0.02em] text-ink" title={app.name}>
            <bdi>{app.name}</bdi>
          </h2>
          {/* The badge sits with the details so long names and long translations both fit. */}
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-3">
            {system && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-ink-2">
                <Lock size={11} /> {t('apps.partOfMacOS')}
              </span>
            )}
            <span>
              {app.version ? `${t('apps.version', { version: app.version })} · ` : ''}
              {app.lastUsedAt ? t('apps.lastOpened', { when: formatRelativeDate(app.lastUsedAt).toLocaleLowerCase() }) : t('apps.lastOpenedUnknown')}
            </span>
          </p>
        </div>
        <div className="shrink-0 text-end">
          <p className="text-[11.5px] font-medium text-ink-3">{t('dashboard.total')}</p>
          {footprint ? <AnimatedBytes bytes={total} className="font-display text-[26px] font-bold tracking-[-0.02em] text-ink" /> : <div className="skeleton mt-1 h-7 w-24" />}
        </div>
      </div>

      <div className="scroll-area flex-1 overflow-y-auto p-3">
        {rows.map((row, i) => (
          <motion.div
            key={row.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2"
          >
            {row.safety ? (
              <Checkbox
                checked={picked.has(row.path)}
                onChange={(on) => {
                  const next = new Set(picked)
                  if (on) next.add(row.path)
            else next.delete(row.path)
                  setPicked(next)
                }}
              />
            ) : (
              <span className="w-5" />
            )}
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: row.color }} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[13.5px] font-semibold text-ink">{row.label}</p>
                {row.safety === 'orange' && <SafetyPill level="orange" />}
              </div>
              <p className="selectable truncate text-[11.5px] text-ink-3">{tildePath(row.path)}</p>
            </div>
            <IconButton label={t('common.revealInFinder')} className="opacity-0 group-hover:opacity-100" onClick={() => reveal(row.path)}>
              <FolderSearch size={15} />
            </IconButton>
            <span className="w-20 text-end text-[13.5px] font-semibold text-ink tabular">{formatBytes(row.sizeBytes)}</span>
          </motion.div>
        ))}
        {!footprint && [0, 1, 2].map((i) => <div key={i} className="skeleton mx-3 my-3 h-9" />)}
        {footprint && items.length === 0 && <p className="px-3 py-4 text-[12.5px] text-ink-3">{t('apps.noLeftovers')}</p>}
        <div className="mx-3 mt-3 flex gap-2.5 rounded-xl bg-surface-2 p-3 text-[12px] text-ink-2">
          <Info size={14} className="mt-[1px] shrink-0 text-brand" />
          <span>{t('apps.explainer')}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2/60 px-6 py-4">
        <Button variant="ghost" onClick={() => reveal(app.path)}>
          <FolderSearch size={15} /> {t('apps.revealFiles')}
        </Button>
        <div className="flex-1" />
        <Button variant="secondary" disabled={picked.size === 0 || flow.busy} onClick={cleanData}>
          <Brush size={15} /> {t('apps.cleanData')}
        </Button>
        <Button variant="danger" disabled={system || flow.busy || !footprint} onClick={uninstall} title={system ? t('errors.native.systemApp') : undefined}>
          <Trash2 size={15} /> {t('apps.uninstall')}
        </Button>
      </div>
    </motion.div>
  )
}

export function AppCleanup() {
  const { t } = useTranslation()
  const applications = useAppStore((s) => s.applications)
  const footprints = useAppStore((s) => s.footprints)
  const loadAppFootprint = useAppStore((s) => s.loadAppFootprint)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'size' | 'name' | 'used'>('size')
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const flow = useCleanupFlow()

  // Measure every app's leftovers in the background, two at a time, so list totals fill in progressively.
  useEffect(() => {
    let cancelled = false
    const queue = [...applications].sort((a, b) => b.sizeBytes - a.sizeBytes)
    const worker = async () => {
      while (!cancelled && queue.length) {
        const app = queue.shift()!
        await loadAppFootprint(app)
      }
    }
    void Promise.all([worker(), worker()])
    return () => {
      cancelled = true
    }
  }, [applications, loadAppFootprint])

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q ? applications.filter((a) => a.name.toLowerCase().includes(q)) : applications
    return [...filtered].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'used') return (a.lastUsedDaysAgo ?? 99999) < (b.lastUsedDaysAgo ?? 99999) ? 1 : -1
      return footprintTotal(b, footprints[b.path]) - footprintTotal(a, footprints[a.path])
    })
  }, [applications, query, sort, footprints])

  const selected = applications.find((a) => a.path === selectedPath) ?? list[0]

  useEffect(() => {
    if (selected) void loadAppFootprint(selected)
  }, [selected, loadAppFootprint])

  return (
    <div>
      {flow.element}
      <PageHeader title={t('nav.apps')} subtitle={t('apps.subtitle')} icon={AppWindow} color="#8b5cf6" />
      <ScanGate area="apps">
        {applications.length === 0 ? (
          <Card>
            <EmptyState icon={AppWindow} color="#8b5cf6" title={t('apps.emptyTitle')} subtitle={t('apps.emptySubtitle')} />
          </Card>
        ) : (
          <Card className="flex h-[calc(100vh-220px)] min-h-[520px] overflow-hidden">
            <div className="flex w-[340px] shrink-0 flex-col border-e border-line">
              <div className="space-y-3 border-b border-line p-4">
                <div className="flex h-9 items-center gap-2 rounded-xl bg-surface-2 px-3">
                  <Search size={15} className="text-ink-3" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('apps.search')} aria-label={t('apps.search')} className="flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3" />
                </div>
                <Segmented size="sm" value={sort} onChange={setSort} className="w-full" options={[{ value: 'size', label: t('apps.sort.size') }, { value: 'name', label: t('apps.sort.name') }, { value: 'used', label: t('apps.sort.leastUsed') }]} />
              </div>
              <div className="scroll-area flex-1 overflow-y-auto p-2">
                {list.map((app) => {
                  const active = selected?.path === app.path
                  const fp = footprints[app.path]
                  return (
                    <button
                      key={app.path}
                      onClick={() => setSelectedPath(app.path)}
                      className={clsx('relative flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-start transition-colors', !active && 'hover:bg-surface-2')}
                    >
                      {active && <motion.span layoutId="app-active" className="absolute inset-0 rounded-xl bg-brand-soft" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                      <span className="relative">
                        <AppIcon app={app} size={38} />
                      </span>
                      <span className="relative min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 truncate text-[13.5px] font-semibold text-ink">
                          {app.name}
                          {isSystem(app) && <Lock size={11} className="shrink-0 text-ink-3" />}
                        </span>
                        <span className="block truncate text-[11.5px] text-ink-3">
                          {app.usageStatus === 'not-used' ? t('apps.notUsedInMonths') : app.lastUsedAt ? t('apps.opened', { when: formatRelativeDate(app.lastUsedAt).toLocaleLowerCase() }) : t('apps.usageUnknown')}
                        </span>
                      </span>
                      <span className="relative text-[12.5px] font-semibold text-ink-2 tabular">{fp ? formatBytes(footprintTotal(app, fp)) : formatBytes(app.sizeBytes)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <AnimatePresence mode="wait">
                {selected && <AppDetail key={selected.path} app={selected} footprint={footprints[selected.path]} flow={flow} onUninstalled={() => setSelectedPath(null)} />}
              </AnimatePresence>
            </div>
          </Card>
        )}
      </ScanGate>
    </div>
  )
}
