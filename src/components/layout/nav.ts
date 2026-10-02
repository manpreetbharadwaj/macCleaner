import {
  Activity,
  AppWindow,
  BrushCleaning,
  CalendarClock,
  ChartPie,
  Copy,
  Download,
  HardDrive,
  LayoutGrid,
  Settings,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import type { TKey } from '@/i18n'

export interface NavItem {
  to: string
  /** Translation key. */
  label: TKey
  icon: LucideIcon
  color: string
}

export const NAV_GROUPS: { title?: TKey; items: NavItem[] }[] = [
  {
    items: [
      { to: '/dashboard', label: 'nav.dashboard', icon: LayoutGrid, color: '#5b6cff' },
      { to: '/smart-clean', label: 'nav.smartClean', icon: Sparkles, color: '#8b5cf6' },
    ],
  },
  {
    title: 'nav.groups.explore',
    items: [
      { to: '/storage', label: 'nav.storage', icon: ChartPie, color: '#13b5e0' },
      { to: '/large-files', label: 'nav.largeFiles', icon: HardDrive, color: '#ff8a4c' },
      { to: '/downloads', label: 'nav.downloads', icon: Download, color: '#13b5e0' },
      { to: '/duplicates', label: 'nav.duplicates', icon: Copy, color: '#f0508a' },
    ],
  },
  {
    title: 'nav.groups.cleanUp',
    items: [
      { to: '/apps', label: 'nav.apps', icon: AppWindow, color: '#8b5cf6' },
      { to: '/system-junk', label: 'nav.systemJunk', icon: BrushCleaning, color: '#19c39a' },
    ],
  },
  {
    title: 'nav.groups.monitor',
    items: [{ to: '/performance', label: 'nav.performance', icon: Activity, color: '#f43f5e' }],
  },
  {
    title: 'nav.groups.automate',
    items: [{ to: '/schedule', label: 'nav.schedule', icon: CalendarClock, color: '#f5b400' }],
  },
]

export const SETTINGS_NAV: NavItem = { to: '/settings', label: 'nav.settings', icon: Settings, color: '#8c91aa' }
