import type { CleanupItem, ScanSession, StorageCategoryId } from '@/types'
import { nextId } from './seed'

export const CATEGORY_LABELS: Record<StorageCategoryId, string> = {
  developer: 'Developer',
  browser: 'Browser',
  applications: 'Applications',
  downloads: 'Downloads',
  files: 'Files',
  system: 'System & Caches',
  documents: 'Documents',
  media: 'Media',
  other: 'Other',
}

export const DASHBOARD_CATEGORY_ORDER: StorageCategoryId[] = [
  'developer',
  'applications',
  'media',
  'documents',
  'downloads',
  'browser',
  'system',
  'other',
]

export function buildInitialScanSession(items: CleanupItem[]): ScanSession {
  const eligible = items.filter((item) => !item.excluded)
  const safeBytes = eligible.filter((i) => i.safety === 'green').reduce((s, i) => s + i.sizeBytes, 0)
  const reviewBytes = eligible.filter((i) => i.safety === 'orange').reduce((s, i) => s + i.sizeBytes, 0)
  const byCategory = new Map<string, number>()
  for (const item of eligible) {
    if (item.safety === 'red') continue
    byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + item.sizeBytes)
  }
  let biggestCategory: StorageCategoryId | null = null
  let biggest = 0
  for (const [category, bytes] of byCategory) {
    if (bytes > biggest) {
      biggest = bytes
      biggestCategory = category as StorageCategoryId
    }
  }
  const now = new Date().toISOString()
  return {
    id: nextId('scan'),
    startedAt: now,
    completedAt: now,
    foundBytes: safeBytes + reviewBytes,
    safeBytes,
    reviewBytes,
    status: 'completed',
    biggestCategory,
  }
}
