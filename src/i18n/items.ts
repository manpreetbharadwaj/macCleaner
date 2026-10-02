import type { CleanupItem } from '@/types'
import { formatRelativeDate } from '@/lib/format'
import { tDynamic } from './index'

/** Display name of a scan item in the current language. File names are never translated. */
export function itemName(item: Pick<CleanupItem, 'name' | 'nameKey' | 'nameParams'>): string {
  if (!item.nameKey) return item.name
  return tDynamic(item.nameKey, { ...item.nameParams, defaultValue: item.name })
}

/** "3 days ago" from the item's date, or its translated label when there's no date. */
export function itemLastUsed(item: Pick<CleanupItem, 'modifiedAt' | 'lastUsedLabel'>): string {
  if (item.modifiedAt) return formatRelativeDate(item.modifiedAt)
  return tDynamic(item.lastUsedLabel, { defaultValue: '' })
}

/** Translates a key stored in data (item explanations etc.); tolerates legacy plain text. */
export function translateStored(keyOrText: string, params?: Record<string, string | number>): string {
  return tDynamic(keyOrText, { ...params, defaultValue: keyOrText })
}
