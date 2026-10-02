import { useMemo, useState } from 'react'
import { useSelection } from '@/hooks/useSelection'
import { AnimatePresence } from 'framer-motion'
import { HardDrive, PartyPopper } from 'lucide-react'
import { clsx } from 'clsx'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Segmented } from '@/components/ui/Segmented'
import { Checkbox } from '@/components/ui/Checkbox'
import { EmptyState } from '@/components/ui/EmptyState'
import { FileRow } from '@/components/cleanup/FileRow'
import { SelectionBar, toFlowItems } from '@/components/cleanup/SelectionBar'
import { useCleanupFlow } from '@/components/cleanup/CleanupFlow'
import { ScanGate } from '@/components/ScanGate'
import { useAppStore } from '@/store/useAppStore'
import { FILE_TYPE_META, PERSONAL_ROOTS, fileTypeOf, type FileType } from '@/lib/meta'
import { formatBytes } from '@/lib/format'
import { sumBytes } from '@/lib/smartClean'
import { useTranslation } from 'react-i18next'
import type { TKey } from '@/i18n'

type SizeFilter = '500mb' | '1gb' | '5gb' | '10gb'
const THRESHOLDS: Record<SizeFilter, number> = { '500mb': 500e6, '1gb': 1e9, '5gb': 5e9, '10gb': 10e9 }

type TypeFilter = 'all' | 'video' | 'disk-image' | 'archive' | 'installer' | 'document' | 'other'
const TYPE_FILTERS: { id: TypeFilter; label: TKey }[] = [
  { id: 'all', label: 'largeFiles.all' },
  { id: 'video', label: 'fileTypes.video' },
  { id: 'disk-image', label: 'fileTypes.diskImage' },
  { id: 'archive', label: 'fileTypes.archive' },
  { id: 'installer', label: 'fileTypes.installer' },
  { id: 'document', label: 'fileTypes.document' },
  { id: 'other', label: 'fileTypes.other' },
]

function bucket(type: FileType): TypeFilter {
  return type === 'image' || type === 'audio' ? 'other' : type
}

export function LargeFiles() {
  const { t } = useTranslation()
  const items = useAppStore((s) => s.cleanupItems)
  const cleanItems = useAppStore((s) => s.cleanItems)
  const flow = useCleanupFlow()
  const [size, setSize] = useState<SizeFilter>('500mb')
  const [type, setType] = useState<TypeFilter>('all')
  const [sort, setSort] = useState<'size' | 'date'>('size')
  const { selected, setSelected, toggle, clear } = useSelection(items)

  const sized = useMemo(
    () => items.filter((i) => !i.excluded && i.extension !== undefined && i.extension !== null && i.root && PERSONAL_ROOTS.has(i.root) && i.sizeBytes >= THRESHOLDS[size]),
    [items, size],
  )
  const counts = useMemo(() => {
    const c: Record<TypeFilter, number> = { all: sized.length, video: 0, 'disk-image': 0, archive: 0, installer: 0, document: 0, other: 0 }
    for (const i of sized) c[bucket(fileTypeOf(i))] += 1
    return c
  }, [sized])
  const list = useMemo(() => {
    const filtered = type === 'all' ? sized : sized.filter((i) => bucket(fileTypeOf(i)) === type)
    return [...filtered].sort((a, b) => (sort === 'size' ? b.sizeBytes - a.sizeBytes : (a.modifiedAt ?? '').localeCompare(b.modifiedAt ?? '')))
  }, [sized, type, sort])

  const selectable = list.filter((i) => i.safety !== 'red')
  const selectedItems = items.filter((i) => selected.has(i.id))
  const allOn = selectable.length > 0 && selectable.every((i) => selected.has(i.id))

  return (
    <div>
      {flow.element}
      <PageHeader title={t('nav.largeFiles')} subtitle={t('largeFiles.subtitle')} icon={HardDrive} color="#ff8a4c" />
      <ScanGate area="largeFiles">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Segmented
            value={size}
            onChange={(v) => {
              setSize(v)
              clear()
            }}
            options={[
              { value: '500mb', label: t('largeFiles.atLeast', { size: formatBytes(500e6, 0) }) },
              { value: '1gb', label: t('largeFiles.atLeast', { size: formatBytes(1e9, 0) }) },
              { value: '5gb', label: t('largeFiles.atLeast', { size: formatBytes(5e9, 0) }) },
              { value: '10gb', label: t('largeFiles.atLeast', { size: formatBytes(10e9, 0) }) },
            ]}
          />
          <Segmented size="sm" value={sort} onChange={setSort} options={[{ value: 'size', label: t('largeFiles.sortLargest') }, { value: 'date', label: t('largeFiles.sortOldest') }]} />
        </div>
        <div className="mb-5 flex flex-wrap gap-2">
          {TYPE_FILTERS.map((f) => {
            const meta = f.id === 'all' ? null : FILE_TYPE_META[f.id]
            const active = type === f.id
            return (
              <button
                key={f.id}
                onClick={() => setType(f.id)}
                className={clsx(
                  'flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-[12.5px] font-semibold transition-all active:scale-95',
                  active ? 'border-transparent bg-ink text-canvas' : 'border-line-strong bg-surface text-ink-2 hover:border-ink-3',
                )}
              >
                {meta && <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />}
                {t(f.label)}
                <span className={clsx('tabular', active ? 'opacity-70' : 'text-ink-3')}>{counts[f.id]}</span>
              </button>
            )
          })}
        </div>

        <Card className="p-2">
          {list.length === 0 ? (
            <EmptyState icon={PartyPopper} color="#ff8a4c" title={t('largeFiles.emptyTitle')} subtitle={t('largeFiles.emptySubtitle')} />
          ) : (
            <>
              <div className="flex items-center gap-3.5 px-3 py-2.5 text-[11.5px] font-semibold tracking-wide text-ink-3 uppercase">
                <Checkbox
                  checked={allOn}
                  indeterminate={!allOn && selectable.some((i) => selected.has(i.id))}
                  onChange={(on) => setSelected(on ? new Set(selectable.map((i) => i.id)) : new Set())}
                  label={t('common.selectAll')}
                />
                <span className="flex-1 ps-[54px]">
                  {t('common.files', { count: list.length })} · {formatBytes(sumBytes(list))}
                </span>
                <span className="w-24 text-end">{t('largeFiles.modified')}</span>
                <span className="w-20 text-end">{t('largeFiles.size')}</span>
              </div>
              <AnimatePresence initial={false}>
                {list.map((item, i) => (
                  <FileRow key={item.id} item={item} index={i} checked={selected.has(item.id)} onToggle={(on) => toggle(item.id, on)} showExclude />
                ))}
              </AnimatePresence>
            </>
          )}
        </Card>
        <p className="mt-3 text-center text-[11.5px] text-ink-3">{t('largeFiles.footnote')}</p>
      </ScanGate>

      <SelectionBar
        count={selected.size}
        bytes={sumBytes(selectedItems)}
        onClear={clear}
        onClean={() =>
          flow.start({
            items: toFlowItems(selectedItems),
            run: (p) => cleanItems([...selected], p),
          })
        }
      />
    </div>
  )
}
