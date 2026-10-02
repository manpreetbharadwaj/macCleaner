import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Archive, Copy, Download, HardDrive, Inbox, PackageOpen, Wand2 } from 'lucide-react'
import { clsx } from 'clsx'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, Reveal } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { IconTile } from '@/components/ui/IconTile'
import { EmptyState } from '@/components/ui/EmptyState'
import { FileRow } from '@/components/cleanup/FileRow'
import { SelectionBar, toFlowItems } from '@/components/cleanup/SelectionBar'
import { useCleanupFlow } from '@/components/cleanup/CleanupFlow'
import { ScanGate } from '@/components/ScanGate'
import { useAppStore } from '@/store/useAppStore'
import { useSelection } from '@/hooks/useSelection'
import { fileTypeOf } from '@/lib/meta'
import { formatBytes } from '@/lib/format'
import { sumBytes } from '@/lib/smartClean'
import type { CleanupItem } from '@/types'
import { Trans, useTranslation } from 'react-i18next'
import type { TKey } from '@/i18n'

const AGE_GROUPS: { id: string; label: TKey; test: (days: number) => boolean }[] = [
  { id: 'today', label: 'downloads.age.today', test: (d) => d < 1 },
  { id: 'week', label: 'downloads.age.week', test: (d) => d >= 1 && d < 7 },
  { id: 'month', label: 'downloads.age.month', test: (d) => d >= 7 && d < 30 },
  { id: '30', label: 'downloads.age.older30', test: (d) => d >= 30 && d < 90 },
  { id: '90', label: 'downloads.age.older90', test: (d) => d >= 90 },
]

type Kind = 'all' | 'installers' | 'archives' | 'duplicates' | 'large'

function kindOf(item: CleanupItem): Kind[] {
  const kinds: Kind[] = []
  const t = fileTypeOf(item)
  if (t === 'installer' || t === 'disk-image') kinds.push('installers')
  if (t === 'archive') kinds.push('archives')
  if (item.duplicateGroup) kinds.push('duplicates')
  if (item.sizeBytes >= 500e6) kinds.push('large')
  return kinds
}

export function Downloads() {
  const { t } = useTranslation()
  const items = useAppStore((s) => s.cleanupItems)
  const cleanItems = useAppStore((s) => s.cleanItems)
  const flow = useCleanupFlow()
  const { selected, setSelected, toggle, clear } = useSelection(items)
  const [kind, setKind] = useState<Kind>('all')

  const downloads = useMemo(() => items.filter((i) => i.root === 'downloads' && !i.excluded), [items])
  const visible = kind === 'all' ? downloads : downloads.filter((i) => kindOf(i).includes(kind))

  const stats: { id: Kind; label: TKey; icon: typeof Download; color: string; items: CleanupItem[] }[] = [
    { id: 'installers', label: 'downloads.kinds.installers', icon: PackageOpen, color: '#13b5e0', items: downloads.filter((i) => kindOf(i).includes('installers')) },
    { id: 'archives', label: 'fileTypes.archive', icon: Archive, color: '#f5b400', items: downloads.filter((i) => kindOf(i).includes('archives')) },
    { id: 'duplicates', label: 'downloads.kinds.duplicates', icon: Copy, color: '#f0508a', items: downloads.filter((i) => kindOf(i).includes('duplicates')) },
    { id: 'large', label: 'downloads.kinds.large', icon: HardDrive, color: '#ff8a4c', items: downloads.filter((i) => kindOf(i).includes('large')) },
  ]

  /** Installers, disk images and archives you haven't touched in 30+ days — the usual "safe to let go" downloads. */
  const suggest = () => {
    const ids = downloads.filter((i) => i.safety !== 'red' && i.ageDays >= 30 && (kindOf(i).includes('installers') || kindOf(i).includes('archives'))).map((i) => i.id)
    setSelected(new Set(ids))
  }

  const selectedItems = items.filter((i) => selected.has(i.id))

  return (
    <div>
      {flow.element}
      <PageHeader
        title={t('nav.downloads')}
        subtitle={t('downloads.subtitle')}
        icon={Download}
        color="#13b5e0"
        actions={
          downloads.length > 0 && (
            <Button variant="soft" onClick={suggest}>
              <Wand2 size={15} /> {t('downloads.selectOldInstallers')}
            </Button>
          )
        }
      />
      <ScanGate area="downloads">
        {downloads.length === 0 ? (
          <Card>
            <EmptyState icon={Inbox} color="#13b5e0" title={t('downloads.emptyTitle')} subtitle={t('downloads.emptySubtitle', { size: formatBytes(1e6, 0) })} />
          </Card>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-4 gap-4">
              {stats.map((s, i) => (
                <Reveal key={s.id} delay={i * 0.05}>
                  <Card
                    interactive
                    onClick={() => setKind(kind === s.id ? 'all' : s.id)}
                    className={clsx('cursor-default p-4', kind === s.id && '!border-brand ring-2 ring-brand/20')}
                  >
                    <IconTile icon={s.icon} color={s.color} size="sm" />
                    <p className="mt-3 text-[12px] font-medium text-ink-3">{t(s.label)}</p>
                    <p className="font-display text-[19px] font-bold text-ink tabular">{formatBytes(sumBytes(s.items))}</p>
                    <p className="text-[11.5px] text-ink-3">{t('common.files', { count: s.items.length })}</p>
                  </Card>
                </Reveal>
              ))}
            </div>

            {kind !== 'all' && (
              <div className="mb-3 flex items-center gap-2 text-[12.5px] text-ink-2">
                <span>
                  <Trans i18nKey="downloads.showing" values={{ label: t(stats.find((s) => s.id === kind)!.label) }} components={{ b: <span className="font-semibold text-ink" /> }} />
                </span>
                <button className="font-semibold text-brand" onClick={() => setKind('all')}>
                  {t('downloads.showAll')}
                </button>
              </div>
            )}

            <div className="space-y-4">
              {AGE_GROUPS.map((group, gi) => {
                const groupItems = visible.filter((i) => group.test(i.ageDays)).sort((a, b) => b.sizeBytes - a.sizeBytes)
                if (groupItems.length === 0) return null
                const selectable = groupItems.filter((i) => i.safety !== 'red')
                const allOn = selectable.every((i) => selected.has(i.id))
                const someOn = selectable.some((i) => selected.has(i.id))
                return (
                  <motion.div key={group.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + gi * 0.05 }}>
                    <Card className="p-2">
                      <div className="flex items-center gap-3.5 px-3 py-2.5">
                        <Checkbox
                          checked={allOn}
                          indeterminate={someOn && !allOn}
                          onChange={(on) => {
                            const next = new Set(selected)
                            for (const i of selectable) if (on) next.add(i.id)
            else next.delete(i.id)
                            setSelected(next)
                          }}
                          label={t('common.selectItem', { name: t(group.label) })}
                        />
                        <p className="flex-1 font-display text-[14.5px] font-semibold text-ink">{t(group.label)}</p>
                        <p className="text-[12.5px] text-ink-3">
                          {t('common.files', { count: groupItems.length })} · <span className="font-semibold text-ink">{formatBytes(sumBytes(groupItems))}</span>
                        </p>
                      </div>
                      {groupItems.map((item, i) => (
                        <FileRow key={item.id} item={item} index={i} checked={selected.has(item.id)} onToggle={(on) => toggle(item.id, on)} note={item.duplicateGroup ? t('downloads.duplicateNote') : undefined} showExclude />
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
        onClean={() => flow.start({ items: toFlowItems(selectedItems), run: (p) => cleanItems([...selected], p) })}
      />
    </div>
  )
}
