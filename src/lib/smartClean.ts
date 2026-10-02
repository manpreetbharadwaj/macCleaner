import { AppWindow, Code2, Download, Globe, Layers, ScrollText, type LucideIcon } from 'lucide-react'
import type { ApplicationItem, CleanupItem } from '@/types'
import { fileTypeOf } from './meta'
import type { TKey } from '@/i18n'

export type SmartGroupId = 'system-junk' | 'browser' | 'app-leftovers' | 'logs' | 'developer' | 'old-downloads'

export interface SmartGroup {
  id: SmartGroupId
  /** Translation key. */
  title: TKey
  /** Translation key. */
  description: TKey
  icon: LucideIcon
  color: string
  items: CleanupItem[]
  /**
   * Whether this group's Safe (green) items start selected. Review (orange)
   * items never start selected anywhere, and Old Downloads — the user's own
   * files — never auto-selects at all.
   */
  autoSelect: boolean
}

const OLD_DOWNLOAD_DAYS = 30
const BUNDLE_ID_LIKE = /^[a-z0-9-]+(\.[a-z0-9_-]+){2,}$/i

/**
 * A ~/Library/Caches folder named like a bundle id ("com.vendor.app") whose
 * app is no longer installed. Only caches are considered — they're
 * regenerated if the app ever returns — and Apple's own caches are never
 * treated as leftovers.
 */
export function isLeftoverCache(item: CleanupItem, installedBundleIds: Set<string>): boolean {
  if (item.root !== 'system-caches') return false
  const name = item.name.toLowerCase()
  if (!BUNDLE_ID_LIKE.test(name) || name.startsWith('com.apple.')) return false
  for (const id of installedBundleIds) {
    if (name === id || name.startsWith(`${id}.`) || id.startsWith(`${name}.`)) return false
  }
  return true
}

export function isOldDownload(item: CleanupItem): boolean {
  if (item.root !== 'downloads') return false
  const type = fileTypeOf(item)
  return type === 'installer' || type === 'disk-image' || type === 'archive' || item.ageDays >= OLD_DOWNLOAD_DAYS
}

export function buildSmartGroups(items: CleanupItem[], applications: ApplicationItem[], developerEnabled: boolean): SmartGroup[] {
  const installed = new Set(applications.map((a) => a.bundleId?.toLowerCase()).filter((id): id is string => !!id))
  const eligible = items.filter((item) => !item.excluded && item.safety !== 'red')

  const groups: SmartGroup[] = [
    {
      id: 'system-junk',
      title: 'smartClean.groups.systemJunk.title',
      description: 'smartClean.groups.systemJunk.description',
      icon: Layers,
      color: '#19c39a',
      items: eligible.filter((i) => i.root === 'system-caches' && !isLeftoverCache(i, installed)),
      autoSelect: true,
    },
    {
      id: 'browser',
      title: 'smartClean.groups.browser.title',
      description: 'smartClean.groups.browser.description',
      icon: Globe,
      color: '#13b5e0',
      items: eligible.filter((i) => i.category === 'browser'),
      autoSelect: true,
    },
    {
      id: 'app-leftovers',
      title: 'smartClean.groups.appLeftovers.title',
      description: 'smartClean.groups.appLeftovers.description',
      icon: AppWindow,
      color: '#8b5cf6',
      items: eligible.filter((i) => isLeftoverCache(i, installed)),
      autoSelect: true,
    },
    {
      id: 'logs',
      title: 'smartClean.groups.logs.title',
      description: 'smartClean.groups.logs.description',
      icon: ScrollText,
      color: '#4f7bff',
      items: eligible.filter((i) => i.root === 'system-logs'),
      autoSelect: true,
    },
    {
      id: 'developer',
      title: 'smartClean.groups.developer.title',
      description: 'smartClean.groups.developer.description',
      icon: Code2,
      color: '#6e5bff',
      items: developerEnabled ? eligible.filter((i) => i.category === 'developer') : [],
      autoSelect: true,
    },
    {
      id: 'old-downloads',
      title: 'smartClean.groups.oldDownloads.title',
      description: 'smartClean.groups.oldDownloads.description',
      icon: Download,
      color: '#ff8a4c',
      items: eligible.filter(isOldDownload),
      autoSelect: false,
    },
  ]

  return groups
    .map((g) => ({ ...g, items: [...g.items].sort((a, b) => b.sizeBytes - a.sizeBytes) }))
    .filter((g) => g.items.length > 0)
}

export function defaultSmartSelection(groups: SmartGroup[]): Set<string> {
  const ids = new Set<string>()
  for (const group of groups) {
    if (!group.autoSelect) continue
    for (const item of group.items) if (item.safety === 'green') ids.add(item.id)
  }
  return ids
}

export function sumBytes(items: CleanupItem[]): number {
  return items.reduce((sum, item) => sum + item.sizeBytes, 0)
}
