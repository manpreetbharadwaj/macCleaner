import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Copy, CopyCheck, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { IconTile } from '@/components/ui/IconTile'
import { EmptyState } from '@/components/ui/EmptyState'
import { FileRow } from '@/components/cleanup/FileRow'
import { SelectionBar, toFlowItems } from '@/components/cleanup/SelectionBar'
import { useCleanupFlow } from '@/components/cleanup/CleanupFlow'
import { ScanGate } from '@/components/ScanGate'
import { useAppStore } from '@/store/useAppStore'
import { useSelection } from '@/hooks/useSelection'
import { FILE_TYPE_META, fileTypeOf } from '@/lib/meta'
import { formatBytes } from '@/lib/format'
import { sumBytes } from '@/lib/smartClean'
import type { CleanupItem } from '@/types'
import { Trans, useTranslation } from 'react-i18next'
import { i18n } from '@/i18n'

interface DupGroup {
  id: string
  copies: CleanupItem[]
  wasted: number
}

function byDate(a: CleanupItem, b: CleanupItem) {
  return (b.modifiedAt ?? '').localeCompare(a.modifiedAt ?? '')
}

export function Duplicates() {
  const { t } = useTranslation()
  const items = useAppStore((s) => s.cleanupItems)
  const cleanItems = useAppStore((s) => s.cleanItems)
  const pushToast = useAppStore((s) => s.pushToast)
  const flow = useCleanupFlow()
  const { selected, setSelected, clear } = useSelection(items)

  const groups = useMemo<DupGroup[]>(() => {
    const map = new Map<string, CleanupItem[]>()
    for (const item of items) {
      if (!item.duplicateGroup || item.excluded) continue
      map.set(item.duplicateGroup, [...(map.get(item.duplicateGroup) ?? []), item])
    }
    return [...map.entries()]
      .filter(([, copies]) => copies.length > 1)
      .map(([id, copies]) => {
        const sorted = [...copies].sort(byDate)
        return { id, copies: sorted, wasted: sumBytes(sorted.slice(1)) }
      })
      .sort((a, b) => b.wasted - a.wasted)
  }, [items])

  const totalWasted = groups.reduce((s, g) => s + g.wasted, 0)
  const totalCopies = groups.reduce((s, g) => s + g.copies.length, 0)

  /** Selects every copy except the one to keep, in every set. Protected copies are never selected. */
  const keep = (which: 'newest' | 'oldest') => {
    const ids = new Set<string>()
    for (const g of groups) {
      const keeper = which === 'newest' ? g.copies[0] : g.copies[g.copies.length - 1]
      for (const c of g.copies) if (c.id !== keeper.id && c.safety !== 'red') ids.add(c.id)
    }
    setSelected(ids)
  }

  /** Never lets every copy of a file be selected — at least one always stays. */
  const toggle = (group: DupGroup, id: string, on: boolean) => {
    const next = new Set(selected)
    if (on) {
      const othersUnselected = group.copies.filter((c) => c.id !== id && !next.has(c.id))
      if (othersUnselected.length === 0) {
        pushToast(i18n.t('duplicates.oneKept'), 'default')
        return
      }
      next.add(id)
    } else next.delete(id)
    setSelected(next)
  }

  const selectedItems = items.filter((i) => selected.has(i.id))

  return (
    <div>
      {flow.element}
      <PageHeader
        title={t('nav.duplicates')}
        subtitle={t('duplicates.subtitle')}
        icon={Copy}
        color="#f0508a"
        actions={
          groups.length > 0 && (
            <>
              <Button variant="secondary" onClick={() => keep('oldest')}>
                {t('duplicates.keepOldest')}
              </Button>
              <Button variant="soft" onClick={() => keep('newest')}>
                <CopyCheck size={15} /> {t('duplicates.keepNewest')}
              </Button>
            </>
          )
        }
      />
      <ScanGate area="duplicates">
        {groups.length === 0 ? (
          <Card>
            <EmptyState icon={CopyCheck} color="#f0508a" title={t('duplicates.emptyTitle')} subtitle={t('duplicates.emptySubtitle')} />
          </Card>
        ) : (
          <>
            <div className="mb-5 flex items-center gap-4 rounded-[var(--radius-card)] bg-gradient-to-r from-[#f0508a]/10 via-[#8b5cf6]/8 to-transparent p-5">
              <div>
                <p className="text-[12px] font-medium text-ink-3">{t('duplicates.totalWasted')}</p>
                <p className="font-display text-[30px] font-bold tracking-[-0.025em] text-ink tabular">{formatBytes(totalWasted)}</p>
              </div>
              <div className="ms-6 border-s border-line ps-6 text-[13px] text-ink-2">
                <p>
                  <Trans i18nKey="duplicates.sets" count={groups.length} components={{ b: <span className="font-semibold text-ink" /> }} />
                  {' · '}
                  <Trans i18nKey="duplicates.copies" count={totalCopies} components={{ b: <span className="font-semibold text-ink" /> }} />
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-3">
                  <ShieldCheck size={13} className="text-mint" /> {t('duplicates.matchedBy')}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {groups.map((g, gi) => {
                const first = g.copies[0]
                const meta = FILE_TYPE_META[fileTypeOf(first)]
                const unselected = g.copies.filter((c) => !selected.has(c.id))
                return (
                  <motion.div key={g.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + gi * 0.05 }}>
                    <Card className="p-2">
                      <div className="flex items-center gap-3.5 px-3 py-3">
                        <IconTile icon={meta.icon} color={meta.color} size="lg" solid />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-[15px] font-semibold text-ink">{first.name}</p>
                          <p className="text-[12.5px] text-ink-3">
                            {t('duplicates.copiesEach', { count: g.copies.length, size: formatBytes(first.sizeBytes) })}
                          </p>
                        </div>
                        <div className="text-end">
                          <p className="text-[11.5px] text-ink-3">{t('duplicates.wasted')}</p>
                          <p className="font-display text-[17px] font-bold text-rose tabular">{formatBytes(g.wasted)}</p>
                        </div>
                      </div>
                      {g.copies.map((c, i) => (
                        <FileRow
                          key={c.id}
                          item={c}
                          index={i}
                          showSafety={c.safety === 'red'}
                          checked={selected.has(c.id)}
                          onToggle={(on) => toggle(g, c.id, on)}
                          note={i === 0 ? t('duplicates.newest') : i === g.copies.length - 1 ? t('duplicates.oldest') : undefined}
                          lockReason={unselected.length === 1 && unselected[0].id === c.id && g.copies.length > 1 && selected.size > 0 && g.copies.some((x) => selected.has(x.id)) ? t('duplicates.kept') : undefined}
                        />
                      ))}
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </>
        )}
      </ScanGate>

      <SelectionBar
        count={selected.size}
        bytes={sumBytes(selectedItems)}
        onClear={clear}
        label={t('duplicates.moveToTrash')}
        onClean={() => flow.start({ items: toFlowItems(selectedItems), run: (p) => cleanItems([...selected], p) })}
      />
    </div>
  )
}
