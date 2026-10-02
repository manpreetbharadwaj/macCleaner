import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronRight, Search } from 'lucide-react'
import { clsx } from 'clsx'
import { Card } from '@/components/ui/Card'
import { Segmented } from '@/components/ui/Segmented'
import { Switch } from '@/components/ui/Switch'
import { Button } from '@/components/ui/Button'
import { usePerformanceStore } from '../usePerformanceStore'
import type { ProcessEntry } from '../types'
import { formatDuration, formatMemory, stateLabel } from '../format'
import { InfoTip, ProcessIcon, Skeleton, StatusChip } from './primitives'
import { ProcessDetails } from './ProcessDetails'
import { useTranslation } from 'react-i18next'
import { formatPercentValue } from '@/i18n/format'

type Filter = 'app' | 'background' | 'all'
type SortKey = 'cpu' | 'memory' | 'time' | 'name'

const PAGE = 40

function compare(a: ProcessEntry, b: ProcessEntry, key: SortKey, now: number): number {
  switch (key) {
    case 'cpu':
      return (b.cpuPercent ?? -1) - (a.cpuPercent ?? -1)
    case 'memory':
      return (b.memoryBytes ?? -1) - (a.memoryBytes ?? -1)
    case 'time':
      return (b.startedAtMs ? now - b.startedAtMs : -1) - (a.startedAtMs ? now - a.startedAtMs : -1)
    case 'name':
      return a.name.localeCompare(b.name)
  }
}

function SortHeader({ label, k, sort, dir, onSort, className, tip }: { label: string; k: SortKey; sort: SortKey; dir: 1 | -1; onSort: (k: SortKey) => void; className?: string; tip?: string }) {
  const active = sort === k
  return (
    <div className={clsx('flex items-center gap-1', className)} role="columnheader" aria-sort={active ? (dir === 1 ? 'descending' : 'ascending') : 'none'}>
      <button type="button" onClick={() => onSort(k)} className={clsx('flex items-center gap-1 rounded-md uppercase transition-colors hover:text-ink', active && 'text-ink')}>
        {label}
        {active && (dir === 1 ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
      </button>
      {tip && <InfoTip label={label}>{tip}</InfoTip>}
    </div>
  )
}

const FULL_COLS = 'grid-cols-[minmax(0,1fr)_130px_96px_92px_20px]'
const COMPACT_COLS = 'grid-cols-[minmax(0,1fr)_60px_76px_70px]'

function Row({ e, now, maxCpu, onOpen, compact }: { e: ProcessEntry; now: number; maxCpu: number; onOpen: () => void; compact: boolean }) {
  const { t } = useTranslation()
  const state = compact ? null : stateLabel(e)
  return (
    <button
      type="button"
      role="row"
      onClick={onOpen}
      className={clsx('group grid w-full items-center gap-3', compact ? COMPACT_COLS : FULL_COLS, ' rounded-xl px-3 py-2.5 text-start transition-colors hover:bg-surface-2 focus-visible:bg-surface-2')}
    >
      <span role="cell" className="flex min-w-0 items-center gap-3">
        <ProcessIcon name={e.name} bundlePath={e.bundlePath} />
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate text-[13.5px] font-semibold text-ink">{e.name}</span>
            {e.isSelf && <StatusChip tone="info">{t('performance.apps.thisApp')}</StatusChip>}
            {state && <StatusChip tone={state.tone}>{state.label}</StatusChip>}
          </span>
          <span className="block truncate text-[11.5px] text-ink-3">
            {e.kind === 'system' ? t('performance.apps.kind.system') : e.kind === 'background' ? t('performance.apps.kind.background') : t('performance.apps.kind.app')}
            {e.processCount > 1 && ` · ${t('performance.apps.processes', { count: e.processCount })}`}
          </span>
        </span>
      </span>
      <span role="cell" className="flex items-center justify-end gap-2">
        {!compact && <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
          <span className="block h-full rounded-full bg-brand transition-[width] duration-700" style={{ width: `${e.cpuPercent ? Math.max(2, (e.cpuPercent / maxCpu) * 100) : 0}%` }} />
        </span>}
        <span className="w-12 text-end text-[12.5px] font-semibold text-ink tabular">{e.cpuPercent === null ? '—' : formatPercentValue(e.cpuPercent, 1)}</span>
      </span>
      <span role="cell" className="text-end text-[12.5px] font-semibold text-ink tabular">
        {e.memoryBytes === null ? '—' : formatMemory(e.memoryBytes)}
      </span>
      <span role="cell" className="text-end text-[12.5px] text-ink-2 tabular">
        {e.startedAtMs ? formatDuration(now - e.startedAtMs) : '—'}
      </span>
      {!compact && <ChevronRight size={15} className="rtl-flip text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />}
    </button>
  )
}

/** `compact` = the "Top apps" preview on the Overview sub-tab. */
export function RunningApps({ compact = false, onSeeAll }: { compact?: boolean; onSeeAll?: () => void }) {
  const { t } = useTranslation()
  const list = usePerformanceStore((s) => s.processes)
  const includeSystem = usePerformanceStore((s) => s.includeSystem)
  const setIncludeSystem = usePerformanceStore((s) => s.setIncludeSystem)
  const [filter, setFilter] = useState<Filter>('app')
  const [sort, setSort] = useState<SortKey>('memory')
  const [dir, setDir] = useState<1 | -1>(1)
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const [openId, setOpenId] = useState<string | null>(null)

  const now = list?.sampledAtMs ?? 0
  const rows = useMemo(() => {
    if (!list) return []
    const q = query.trim().toLowerCase()
    const filtered = list.entries.filter((e) => (compact ? e.kind === 'app' : filter === 'all' || e.kind === filter || (filter === 'background' && e.kind === 'system'))).filter((e) => !q || e.name.toLowerCase().includes(q))
    return filtered.sort((a, b) => dir * compare(a, b, compact ? 'memory' : sort, now))
  }, [list, filter, sort, dir, query, compact, now])

  const counts = useMemo(() => {
    const c = { app: 0, background: 0, all: list?.entries.length ?? 0 }
    for (const e of list?.entries ?? []) {
      if (e.kind === 'app') c.app += 1
      else c.background += 1
    }
    return c
  }, [list])

  const shown = compact ? rows.slice(0, 5) : rows.slice(0, limit)
  const maxCpu = Math.max(5, ...rows.map((r) => r.cpuPercent ?? 0))
  const onSort = (k: SortKey) => {
    if (k === sort) setDir((d) => (d === 1 ? -1 : 1))
    else {
      setSort(k)
      setDir(k === 'name' ? -1 : 1)
    }
  }

  return (
    <>
      {!compact && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Segmented
            value={filter}
            onChange={(v) => {
              setFilter(v)
              setLimit(PAGE)
            }}
            options={[
              { value: 'app', label: t('performance.apps.filter.apps'), badge: String(counts.app) },
              { value: 'background', label: t('performance.apps.filter.background'), badge: String(counts.background) },
              { value: 'all', label: t('performance.apps.filter.all'), badge: String(counts.all) },
            ]}
          />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-2">
              <Switch checked={includeSystem} onChange={setIncludeSystem} label={t('performance.apps.showSystem')} />
              {t('performance.apps.showSystem')}
            </label>
            <div className="flex h-9 items-center gap-2 rounded-xl bg-surface-2 px-3">
              <Search size={14} className="text-ink-3" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('common.search')} aria-label={t('performance.apps.search')} className="selectable w-36 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3" />
            </div>
          </div>
        </div>
      )}

      <Card className="p-2" role="table" aria-label={t('performance.runningApps')}>
        <div role="row" className={clsx('grid gap-3 px-3', compact ? COMPACT_COLS : FULL_COLS, ' py-2 text-[11px] font-semibold tracking-wide text-ink-3 uppercase')}>
          {compact ? (
            <>
              <span role="columnheader">{t('performance.apps.cols.app')}</span>
              <span role="columnheader" className="text-end">{t('performance.cpu')}</span>
              <span role="columnheader" className="text-end">{t('performance.memory')}</span>
              <span role="columnheader" className="text-end">{t('performance.apps.cols.running')}</span>
            </>
          ) : (
            <>
              <SortHeader label={t('performance.apps.cols.name')} k="name" sort={sort} dir={dir} onSort={onSort} />
              <SortHeader label={t('performance.cpu')} k="cpu" sort={sort} dir={dir} onSort={onSort} tip={t('performance.apps.cpuTip')} />
              <SortHeader label={t('performance.memory')} k="memory" sort={sort} dir={dir} onSort={onSort} className="justify-end" tip={t('performance.apps.memoryTip')} />
              <SortHeader label={t('performance.apps.cols.running')} k="time" sort={sort} dir={dir} onSort={onSort} className="justify-end" />
              <span />
            </>
          )}
        </div>
        {!list ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: compact ? 5 : 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <p className="px-3 py-10 text-center text-[13px] text-ink-3">{query ? t('common.noMatches') : t('performance.apps.nothing')}</p>
        ) : (
          shown.map((e) => <Row key={e.id} e={e} now={now} maxCpu={maxCpu} onOpen={() => setOpenId(e.id)} compact={compact} />)
        )}
        {!compact && rows.length > limit && (
          <div className="p-2 text-center">
            <Button variant="ghost" size="sm" onClick={() => setLimit((l) => l + PAGE * 2)}>
              {t('performance.apps.showMore', { count: rows.length - limit })}
            </Button>
          </div>
        )}
        {compact && onSeeAll && (
          <div className="border-t border-line p-2 text-center">
            <Button variant="ghost" size="sm" onClick={onSeeAll}>
              {t('performance.apps.seeAll')} <ChevronRight size={14} className="rtl-flip" />
            </Button>
          </div>
        )}
      </Card>
      {!compact && list && (
        <p className="mt-3 text-center text-[11.5px] text-ink-3">
          {t('performance.apps.footnote', { count: list.totalProcesses })}
        </p>
      )}
      <ProcessDetails id={openId} onClose={() => setOpenId(null)} />
    </>
  )
}
