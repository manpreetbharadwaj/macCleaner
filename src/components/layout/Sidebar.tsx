import { useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { useAppStore } from '@/store/useAppStore'
import { formatBytesCompact } from '@/lib/format'
import { buildSmartGroups, sumBytes } from '@/lib/smartClean'
import { Logo } from '@/components/ui/Logo'
import { Trans, useTranslation } from 'react-i18next'
import { formatPercentValue } from '@/i18n/format'
import { NAV_GROUPS, SETTINGS_NAV, type NavItem } from './nav'

function NavRow({ item, badge }: { item: NavItem; badge?: string }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const active = pathname.startsWith(item.to)
  const Icon = item.icon
  return (
    <NavLink to={item.to} className="group relative flex h-9.5 items-center gap-3 rounded-xl px-2.5 text-[13.5px] font-medium">
      {active && (
        <motion.span
          layoutId="nav-active"
          className="absolute inset-0 rounded-xl bg-surface shadow-[0_1px_2px_rgba(20,22,60,0.06),0_6px_18px_-8px_rgba(20,22,60,0.2)] dark:bg-surface-3"
          transition={{ type: 'spring', stiffness: 520, damping: 40 }}
        />
      )}
      <span
        className={clsx('relative flex h-6.5 w-6.5 items-center justify-center rounded-lg transition-all duration-300', !active && 'group-hover:scale-110')}
        style={
          active
            ? { background: `linear-gradient(140deg, ${item.color}, color-mix(in srgb, ${item.color} 60%, #6e5bff))`, color: '#fff', boxShadow: `0 4px 10px -3px ${item.color}` }
            : { color: item.color }
        }
      >
        <Icon size={15} strokeWidth={2.2} />
      </span>
      <span className={clsx('relative flex-1 transition-colors', active ? 'font-semibold text-ink' : 'text-ink-2 group-hover:text-ink')}>{t(item.label)}</span>
      {badge && <span className="relative rounded-full bg-brand-soft px-2 py-[1px] text-[10.5px] font-bold text-brand">{badge}</span>}
    </NavLink>
  )
}

export function Sidebar() {
  const { t } = useTranslation()
  const disk = useAppStore((s) => s.diskSummary)
  const hasScanned = useAppStore((s) => s.hasScanned)
  const items = useAppStore((s) => s.cleanupItems)
  const applications = useAppStore((s) => s.applications)
  const devEnabled = useAppStore((s) => s.settings?.developerCleanupEnabled ?? true)
  // Same "safe right now" figure the Smart Clean screen and Dashboard show.
  const safeNow = useMemo(
    () => buildSmartGroups(items, applications, devEnabled).filter((g) => g.autoSelect).reduce((s, g) => s + sumBytes(g.items.filter((i) => i.safety === 'green')), 0),
    [items, applications, devEnabled],
  )
  const usedPct = disk && disk.totalBytes > 0 ? (disk.usedBytes / disk.totalBytes) * 100 : 0
  const smartBadge = hasScanned && safeNow > 1e8 ? formatBytesCompact(safeNow) : undefined

  return (
    <aside className="glass relative z-20 flex w-[248px] shrink-0 flex-col border-e border-line">
      <div data-tauri-drag-region className="h-11 shrink-0" />
      <div data-tauri-drag-region className="flex items-center gap-2.5 px-5 pb-5">
        <Logo size={30} />
        <div className="pointer-events-none leading-tight">
          <p className="font-display text-[15px] font-bold tracking-[-0.015em] text-ink">MacBook Cleaner</p>
          <p className="text-[11px] text-ink-3">{t('common.tagline')}</p>
        </div>
      </div>

      <nav className="scroll-area flex-1 space-y-4 overflow-y-auto px-3">
        {NAV_GROUPS.map((group, i) => (
          <div key={i}>
            {group.title && <p className="mb-1 px-3 text-[10.5px] font-bold tracking-[0.08em] text-ink-3 uppercase">{t(group.title)}</p>}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavRow key={item.to} item={item} badge={item.to === '/smart-clean' ? smartBadge : undefined} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-3 p-3">
        <NavRow item={SETTINGS_NAV} />
        {disk && disk.totalBytes > 0 && (
          <NavLink to="/storage" className="block rounded-2xl border border-line bg-surface/70 p-3.5 transition-colors hover:border-line-strong">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[12px] font-semibold text-ink">Macintosh HD</span>
              <span className="text-[11px] text-ink-3 tabular">{t('sidebar.percentUsed', { percent: formatPercentValue(usedPct) })}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
              <motion.div
                className="h-full rounded-full brand-gradient"
                initial={{ width: 0 }}
                animate={{ width: `${usedPct}%` }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <p className="mt-2 text-[11.5px] text-ink-3">
              <Trans i18nKey="sidebar.freeOf" values={{ free: formatBytesCompact(disk.freeBytes), total: formatBytesCompact(disk.totalBytes) }} components={{ b: <span className="font-semibold text-ink-2" /> }} />
            </p>
          </NavLink>
        )}
      </div>
    </aside>
  )
}
