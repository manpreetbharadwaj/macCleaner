import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ChartPie, FolderSearch, Info } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, Reveal } from '@/components/ui/Card'
import { Button, IconButton } from '@/components/ui/Button'
import { IconTile } from '@/components/ui/IconTile'
import { Bar, StackedBar } from '@/components/ui/Bar'
import { AnimatedBytes } from '@/components/ui/AnimatedNumber'
import { Modal } from '@/components/ui/Modal'
import { AppIcon } from '@/components/ui/AppIcon'
import { ScanGate } from '@/components/ScanGate'
import { useAppStore } from '@/store/useAppStore'
import { BREAKDOWN_META, BREAKDOWN_ORDER, FILE_TYPE_META, fileTypeOf } from '@/lib/meta'
import { buildSmartGroups, sumBytes } from '@/lib/smartClean'
import { formatBytes, formatPercent, parentFolder } from '@/lib/format'
import type { BreakdownId, CleanupItem } from '@/types'
import { useTranslation } from 'react-i18next'
import type { TKey } from '@/i18n'
import { itemName } from '@/i18n/items'

const EXPLAIN: Partial<Record<BreakdownId, TKey>> = {
  photos: 'storage.explain.photos',
  other: 'storage.explain.other',
  'system-data': 'storage.explain.systemData',
}

const LINKS: Partial<Record<BreakdownId, { to: string; label: TKey }>> = {
  applications: { to: '/apps', label: 'storage.links.apps' },
  documents: { to: '/large-files', label: 'storage.links.largeFiles' },
  videos: { to: '/large-files', label: 'storage.links.largeVideos' },
  downloads: { to: '/downloads', label: 'storage.links.downloads' },
  cache: { to: '/system-junk', label: 'storage.links.systemJunk' },
}

function itemsFor(id: BreakdownId, items: CleanupItem[]): CleanupItem[] {
  const active = items.filter((i) => !i.excluded)
  switch (id) {
    case 'documents':
      return active.filter((i) => i.root === 'documents' || i.root === 'desktop')
    case 'videos':
      return active.filter((i) => i.root === 'movies' || (i.extension && fileTypeOf(i) === 'video'))
    case 'downloads':
      return active.filter((i) => i.root === 'downloads')
    case 'cache':
      return active.filter((i) => i.root === 'system-caches' || i.root === 'system-logs' || i.category === 'browser')
    default:
      return []
  }
}

function DetailRow({ item }: { item: CleanupItem }) {
  const { t } = useTranslation()
  const reveal = useAppStore((s) => s.revealInFinder)
  const type = FILE_TYPE_META[fileTypeOf(item)]
  return (
    <div className="group flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-surface-2">
      <IconTile icon={type.icon} color={type.color} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-ink">{itemName(item)}</p>
        <p className="selectable truncate text-[11.5px] text-ink-3">{parentFolder(item.path)}</p>
      </div>
      <IconButton label={t('common.revealInFinder')} className="opacity-0 group-hover:opacity-100" onClick={() => reveal(item.path)}>
        <FolderSearch size={15} />
      </IconButton>
      <span className="w-20 text-end text-[13px] font-semibold text-ink tabular">{formatBytes(item.sizeBytes)}</span>
    </div>
  )
}

export function Storage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const disk = useAppStore((s) => s.diskSummary)
  const breakdown = useAppStore((s) => s.breakdown)
  const items = useAppStore((s) => s.cleanupItems)
  const applications = useAppStore((s) => s.applications)
  const settings = useAppStore((s) => s.settings)
  const [open, setOpen] = useState<BreakdownId | null>(null)

  const potential = useMemo(
    () => buildSmartGroups(items, applications, settings?.developerCleanupEnabled ?? true).reduce((s, g) => s + sumBytes(g.items), 0),
    [items, applications, settings?.developerCleanupEnabled],
  )
  const entries = BREAKDOWN_ORDER.map((id) => ({ id, bytes: breakdown.find((b) => b.id === id)?.bytes ?? 0 }))
  const max = Math.max(1, ...entries.map((e) => e.bytes))
  const used = disk?.usedBytes ?? 0
  const total = disk?.totalBytes ?? 0

  const openMeta = open ? BREAKDOWN_META[open] : null
  const openItems = open ? itemsFor(open, items).sort((a, b) => b.sizeBytes - a.sizeBytes).slice(0, 40) : []
  const openApps = open === 'applications' ? [...applications].sort((a, b) => b.sizeBytes - a.sizeBytes).slice(0, 40) : []

  return (
    <div>
      <PageHeader title={t('nav.storage')} subtitle={t('storage.subtitle')} icon={ChartPie} color="#13b5e0" />
      <ScanGate area="storage">
        <Reveal>
          <Card className="p-6">
            <div className="grid grid-cols-4 gap-6">
              {[
                [t('storage.totalStorage'), total, 'text-ink'],
                [t('dashboard.used'), used, 'text-ink'],
                [t('dashboard.free'), disk?.freeBytes ?? 0, 'text-ink'],
                [t('dashboard.potentialCleanup'), potential, 'mint-text'],
              ].map(([label, bytes, cls], i) => (
                <motion.div key={label as string} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <p className="text-[12px] font-medium text-ink-3">{label as string}</p>
                  <AnimatedBytes bytes={bytes as number} className={`font-display text-[28px] font-bold tracking-[-0.025em] ${cls as string}`} />
                </motion.div>
              ))}
            </div>
            <div className="mt-6">
              <StackedBar
                height={16}
                total={total}
                segments={entries.map((e) => ({ id: e.id, value: e.bytes, color: BREAKDOWN_META[e.id].color, label: `${t(BREAKDOWN_META[e.id].label)}: ${formatBytes(e.bytes)}` }))}
              />
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                {entries.map((e) => (
                  <span key={e.id} className="flex items-center gap-1.5 text-[12px] text-ink-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: BREAKDOWN_META[e.id].color }} />
                    {t(BREAKDOWN_META[e.id].label)}
                  </span>
                ))}
                <span className="flex items-center gap-1.5 text-[12px] text-ink-3">
                  <span className="h-2 w-2 rounded-full bg-surface-3" /> {t('dashboard.free')}
                </span>
              </div>
            </div>
          </Card>
        </Reveal>

        <div className="mt-5 grid grid-cols-4 gap-4">
          {entries.map((e, i) => {
            const meta = BREAKDOWN_META[e.id]
            return (
              <Reveal key={e.id} delay={0.08 + i * 0.04}>
                <Card interactive className="group h-full cursor-default p-5" onClick={() => setOpen(e.id)}>
                  <div className="flex items-start justify-between">
                    <IconTile icon={meta.icon} color={meta.color} size="md" solid />
                    <span className="text-[12px] font-semibold text-ink-3 tabular">{formatPercent(e.bytes, used)}</span>
                  </div>
                  <p className="mt-4 text-[13px] font-semibold text-ink-2">{t(meta.label)}</p>
                  <p className="font-display text-[22px] font-bold tracking-[-0.02em] text-ink tabular">{formatBytes(e.bytes)}</p>
                  <Bar value={e.bytes} max={max} color={meta.color} className="mt-3" delay={0.2 + i * 0.05} height={6} />
                  <p className="mt-3 flex items-center gap-1 text-[11.5px] text-ink-3 transition-colors group-hover:text-brand">
                    {t('storage.details')} <ArrowRight size={12} className="rtl-flip transition-transform group-hover:translate-x-0.5" />
                  </p>
                </Card>
              </Reveal>
            )
          })}
        </div>
      </ScanGate>

      <Modal open={open !== null} onClose={() => setOpen(null)} width={620}>
        {open && openMeta && (
          <div className="flex max-h-[80vh] flex-col">
            <div className="flex items-center gap-4 border-b border-line p-6 pe-14">
              <IconTile icon={openMeta.icon} color={openMeta.color} size="lg" solid />
              <div className="flex-1">
                <h2 className="font-display text-[20px] font-bold text-ink">{t(openMeta.label)}</h2>
                <p className="text-[12.5px] text-ink-3">{t(openMeta.description)}</p>
              </div>
              <p className="font-display text-[22px] font-bold text-ink tabular">{formatBytes(entries.find((e) => e.id === open)?.bytes ?? 0)}</p>
            </div>
            <div className="scroll-area flex-1 overflow-y-auto p-3">
              {EXPLAIN[open] && (
                <div className="m-2 flex gap-2.5 rounded-xl bg-surface-2 p-3.5 text-[12.5px] leading-relaxed text-ink-2">
                  <Info size={15} className="mt-[1px] shrink-0 text-brand" />
                  {t(EXPLAIN[open])}
                </div>
              )}
              {openApps.map((app) => (
                <div key={app.id} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-surface-2">
                  <AppIcon app={app} size={32} />
                  <p className="flex-1 truncate text-[13px] font-semibold text-ink">{app.name}</p>
                  <span className="text-[13px] font-semibold text-ink tabular">{formatBytes(app.sizeBytes)}</span>
                </div>
              ))}
              {openItems.map((item) => (
                <DetailRow key={item.id} item={item} />
              ))}
              {!EXPLAIN[open] && openItems.length === 0 && openApps.length === 0 && (
                <p className="p-6 text-center text-[13px] text-ink-3">{t('storage.noItems')}</p>
              )}
              {openItems.length > 0 && <p className="px-3 pt-2 text-[11.5px] text-ink-3">{t('storage.showingLargest', { size: formatBytes(1e6, 0) })}</p>}
            </div>
            {LINKS[open] && (
              <div className="flex justify-end border-t border-line bg-surface-2/60 px-6 py-4">
                <Button
                  variant="primary"
                  onClick={() => {
                    setOpen(null)
                    navigate(LINKS[open]!.to)
                  }}
                >
                  {t(LINKS[open]!.label)} <ArrowRight size={15} className="rtl-flip" />
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
