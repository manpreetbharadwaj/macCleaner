import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BrushCleaning, Code2, Eye, Globe, Hammer, Layers, Package, ScrollText, ShieldCheck, Smartphone, Sparkles, type LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, Reveal } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { IconTile } from '@/components/ui/IconTile'
import { AnimatedBytes } from '@/components/ui/AnimatedNumber'
import { EmptyState } from '@/components/ui/EmptyState'
import { FileRow } from '@/components/cleanup/FileRow'
import { SelectionBar, toFlowItems } from '@/components/cleanup/SelectionBar'
import { useCleanupFlow } from '@/components/cleanup/CleanupFlow'
import { ScanGate } from '@/components/ScanGate'
import { useAppStore } from '@/store/useAppStore'
import { useSelection } from '@/hooks/useSelection'
import { sumBytes } from '@/lib/smartClean'
import { formatBytes } from '@/lib/format'
import type { CleanupItem, DeveloperTool } from '@/types'
import { Trans, useTranslation } from 'react-i18next'

const TOOL_META: Record<DeveloperTool, { icon: LucideIcon; color: string; label: string }> = {
  xcode: { icon: Hammer, color: '#4f7bff', label: 'Xcode' },
  node: { icon: Package, color: '#19c39a', label: 'JavaScript' },
  android: { icon: Smartphone, color: '#3ddc84', label: 'Android' },
  cocoapods: { icon: Package, color: '#f0508a', label: 'CocoaPods' },
  docker: { icon: Package, color: '#13b5e0', label: 'Docker' },
  general: { icon: Code2, color: '#8b5cf6', label: 'Developer' },
}

function iconFor(item: CleanupItem): { icon: LucideIcon; color: string } {
  if (item.category === 'browser') return { icon: Globe, color: '#13b5e0' }
  if (item.root === 'system-logs') return { icon: ScrollText, color: '#4f7bff' }
  return { icon: Layers, color: '#19c39a' }
}

function Section({
  title,
  subtitle,
  icon,
  color,
  items,
  selected,
  setSelected,
  toggle,
  rowIcon,
  delay,
}: {
  title: string
  subtitle: string
  icon: LucideIcon
  color: string
  items: CleanupItem[]
  selected: Set<string>
  setSelected: (s: Set<string>) => void
  toggle: (id: string, on: boolean) => void
  rowIcon: (i: CleanupItem) => { icon: LucideIcon; color: string }
  delay: number
}) {
  const { t } = useTranslation()
  const selectable = items.filter((i) => i.safety !== 'red')
  const allOn = selectable.length > 0 && selectable.every((i) => selected.has(i.id))
  const someOn = selectable.some((i) => selected.has(i.id))
  return (
    <Reveal delay={delay}>
      <Card className="p-2">
        <div className="flex items-center gap-3.5 px-3 py-3">
          <Checkbox
            checked={allOn}
            indeterminate={someOn && !allOn}
            disabled={selectable.length === 0}
            onChange={(on) => {
              const next = new Set(selected)
              for (const i of selectable) if (on) next.add(i.id)
            else next.delete(i.id)
              setSelected(next)
            }}
            label={t('smartClean.selectAllIn', { group: title })}
          />
          <IconTile icon={icon} color={color} size="md" solid />
          <div className="flex-1">
            <p className="font-display text-[15px] font-semibold text-ink">{title}</p>
            <p className="text-[12.5px] text-ink-3">{subtitle}</p>
          </div>
          <p className="font-display text-[17px] font-bold text-ink tabular">{formatBytes(sumBytes(items))}</p>
        </div>
        {items.map((item, i) => {
          const ri = rowIcon(item)
          return <FileRow key={item.id} item={item} index={i} checked={selected.has(item.id)} onToggle={(on) => toggle(item.id, on)} icon={ri.icon} color={ri.color} showExclude />
        })}
      </Card>
    </Reveal>
  )
}

export function SystemJunk() {
  const { t } = useTranslation()
  const items = useAppStore((s) => s.cleanupItems)
  const settings = useAppStore((s) => s.settings)
  const cleanItems = useAppStore((s) => s.cleanItems)
  const flow = useCleanupFlow()
  const { selected, setSelected, toggle, clear } = useSelection(items)
  const devEnabled = settings?.developerCleanupEnabled ?? true

  const junk = useMemo(
    () => items.filter((i) => !i.excluded && (i.root === 'system-caches' || i.root === 'system-logs' || i.category === 'browser')).sort((a, b) => b.sizeBytes - a.sizeBytes),
    [items],
  )
  const dev = useMemo(() => items.filter((i) => !i.excluded && i.category === 'developer').sort((a, b) => b.sizeBytes - a.sizeBytes), [items])
  const safe = junk.filter((i) => i.safety === 'green')
  const review = junk.filter((i) => i.safety === 'orange')
  const devSafe = devEnabled ? dev.filter((i) => i.safety === 'green') : []
  const devReview = devEnabled ? dev.filter((i) => i.safety !== 'green') : []
  const selectedItems = items.filter((i) => selected.has(i.id))

  const selectAllSafe = () => setSelected(new Set([...safe, ...devSafe].map((i) => i.id)))

  return (
    <div>
      {flow.element}
      <PageHeader
        title={t('nav.systemJunk')}
        subtitle={t('systemJunk.subtitle')}
        icon={BrushCleaning}
        color="#19c39a"
        actions={
          safe.length + devSafe.length > 0 && (
            <Button variant="mint" onClick={selectAllSafe}>
              <Sparkles size={15} /> {t('systemJunk.selectAllSafe')}
            </Button>
          )
        }
      />
      <ScanGate area="systemJunk">
        <div className="mb-5 grid grid-cols-2 gap-4">
          <Reveal>
            <Card className="relative overflow-hidden p-5">
              <div className="absolute -top-10 -end-6 h-32 w-32 rounded-full bg-mint/15 blur-2xl" />
              <div className="flex items-center gap-2 text-[12.5px] font-semibold text-mint">
                <ShieldCheck size={15} /> {t('systemJunk.safeToClean')}
              </div>
              <AnimatedBytes bytes={sumBytes(safe) + sumBytes(devSafe)} className="mt-1 block font-display text-[32px] font-bold tracking-[-0.025em] text-ink" />
              <p className="text-[12.5px] text-ink-3">{t('systemJunk.safeBody')}</p>
            </Card>
          </Reveal>
          <Reveal delay={0.05}>
            <Card className="relative overflow-hidden p-5">
              <div className="absolute -top-10 -end-6 h-32 w-32 rounded-full bg-sun/15 blur-2xl" />
              <div className="flex items-center gap-2 text-[12.5px] font-semibold text-sun">
                <Eye size={15} /> {t('systemJunk.reviewRecommended')}
              </div>
              <AnimatedBytes bytes={sumBytes(review) + sumBytes(devReview.filter((i) => i.safety === 'orange'))} className="mt-1 block font-display text-[32px] font-bold tracking-[-0.025em] text-ink" />
              <p className="text-[12.5px] text-ink-3">{t('systemJunk.reviewBody')}</p>
            </Card>
          </Reveal>
        </div>

        {junk.length === 0 && dev.length === 0 ? (
          <Card>
            <EmptyState icon={BrushCleaning} color="#19c39a" title={t('systemJunk.emptyTitle')} subtitle={t('systemJunk.emptySubtitle')} />
          </Card>
        ) : (
          <div className="space-y-4">
            {safe.length > 0 && <Section title={t('systemJunk.safeToClean')} subtitle={t('systemJunk.safeSubtitle')} icon={ShieldCheck} color="#19c39a" items={safe} selected={selected} setSelected={setSelected} toggle={toggle} rowIcon={iconFor} delay={0.1} />}
            {review.length > 0 && <Section title={t('systemJunk.reviewRecommended')} subtitle={t('systemJunk.reviewSubtitle')} icon={Eye} color="#ff8a4c" items={review} selected={selected} setSelected={setSelected} toggle={toggle} rowIcon={iconFor} delay={0.14} />}
            {dev.length > 0 &&
              (devEnabled ? (
                <Section
                  title={t('systemJunk.developer')}
                  subtitle={t('systemJunk.developerSubtitle')}
                  icon={Code2}
                  color="#6e5bff"
                  items={dev}
                  selected={selected}
                  setSelected={setSelected}
                  toggle={toggle}
                  rowIcon={(i) => TOOL_META[i.tool ?? 'general']}
                  delay={0.18}
                />
              ) : (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-[12.5px] text-ink-3">
                  <Trans i18nKey="systemJunk.devHidden" values={{ size: formatBytes(sumBytes(dev)) }} components={{ link: <Link to="/settings" className="font-semibold text-brand" /> }} />
                </motion.p>
              ))}
          </div>
        )}
      </ScanGate>

      <SelectionBar
        count={selected.size}
        bytes={sumBytes(selectedItems)}
        onClear={clear}
        label={t('systemJunk.clean')}
        onClean={() => flow.start({ items: toFlowItems(selectedItems), run: (p) => cleanItems([...selected], p) })}
      />
    </div>
  )
}
