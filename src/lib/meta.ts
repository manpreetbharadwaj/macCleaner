import {
  AppWindow,
  Archive,
  Box,
  Clapperboard,
  Database,
  Disc3,
  Download,
  File,
  FileText,
  FolderOpen,
  Image,
  Layers,
  Music,
  PackageOpen,
  type LucideIcon,
} from 'lucide-react'
import type { BreakdownId, CleanupItem } from '@/types'
import type { TKey } from '@/i18n'

export interface BreakdownMeta {
  /** Translation key. */
  label: TKey
  color: string
  icon: LucideIcon
  /** Translation key. */
  description: TKey
}

/** Each storage category gets its own color identity, used consistently on every screen. */
export const BREAKDOWN_META: Record<BreakdownId, BreakdownMeta> = {
  applications: { label: 'breakdown.applications.label', color: '#8b5cf6', icon: AppWindow, description: 'breakdown.applications.description' },
  documents: { label: 'breakdown.documents.label', color: '#4f7bff', icon: FileText, description: 'breakdown.documents.description' },
  photos: { label: 'breakdown.photos.label', color: '#f0508a', icon: Image, description: 'breakdown.photos.description' },
  videos: { label: 'breakdown.videos.label', color: '#ff8a4c', icon: Clapperboard, description: 'breakdown.videos.description' },
  downloads: { label: 'breakdown.downloads.label', color: '#13b5e0', icon: Download, description: 'breakdown.downloads.description' },
  cache: { label: 'breakdown.cache.label', color: '#19c39a', icon: Layers, description: 'breakdown.cache.description' },
  other: { label: 'breakdown.other.label', color: '#f5b400', icon: Music, description: 'breakdown.other.description' },
  'system-data': { label: 'breakdown.systemData.label', color: '#9aa0bd', icon: Database, description: 'breakdown.systemData.description' },
}

export const BREAKDOWN_ORDER: BreakdownId[] = ['applications', 'documents', 'photos', 'videos', 'downloads', 'cache', 'other', 'system-data']

// ---------------------------------------------------------------------------
// File types (Large Files / Downloads)
// ---------------------------------------------------------------------------

export type FileType = 'video' | 'disk-image' | 'archive' | 'installer' | 'document' | 'image' | 'audio' | 'other'

const EXT_TYPES: Record<FileType, string[]> = {
  video: ['mov', 'mp4', 'm4v', 'avi', 'mkv', 'webm', 'wmv', 'mts', 'braw', 'prores'],
  'disk-image': ['dmg', 'iso', 'img', 'sparseimage', 'sparsebundle', 'vmdk', 'vdi', 'qcow2', 'hdd'],
  archive: ['zip', 'tar', 'gz', 'tgz', 'rar', '7z', 'xz', 'bz2', 'xip'],
  installer: ['pkg', 'mpkg', 'apk', 'ipa', 'exe', 'msi'],
  document: ['pdf', 'doc', 'docx', 'pages', 'key', 'numbers', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'psd', 'ai', 'sketch', 'fig', 'txt', 'md', 'rtf', 'indd'],
  image: ['jpg', 'jpeg', 'png', 'heic', 'gif', 'tiff', 'raw', 'cr2', 'nef', 'arw', 'webp'],
  audio: ['mp3', 'wav', 'aac', 'm4a', 'flac', 'aiff', 'logicx'],
  other: [],
}

export function fileTypeOf(item: Pick<CleanupItem, 'extension' | 'name'>): FileType {
  const ext = (item.extension ?? item.name.split('.').pop() ?? '').toLowerCase()
  for (const [type, exts] of Object.entries(EXT_TYPES) as [FileType, string[]][]) {
    if (exts.includes(ext)) return type
  }
  return 'other'
}

export const FILE_TYPE_META: Record<FileType, { label: TKey; color: string; icon: LucideIcon }> = {
  video: { label: 'fileTypes.video', color: '#ff8a4c', icon: Clapperboard },
  'disk-image': { label: 'fileTypes.diskImage', color: '#8b5cf6', icon: Disc3 },
  archive: { label: 'fileTypes.archive', color: '#f5b400', icon: Archive },
  installer: { label: 'fileTypes.installer', color: '#13b5e0', icon: PackageOpen },
  document: { label: 'fileTypes.document', color: '#4f7bff', icon: FileText },
  image: { label: 'fileTypes.image', color: '#f0508a', icon: Image },
  audio: { label: 'fileTypes.audio', color: '#19c39a', icon: Music },
  other: { label: 'fileTypes.other', color: '#9aa0bd', icon: File },
}

/** Roots that hold the user's own files (as opposed to caches/tool data). */
export const PERSONAL_ROOTS = new Set(['downloads', 'desktop', 'documents', 'movies'])

export function isPersonalFile(item: CleanupItem): boolean {
  return !!item.root && PERSONAL_ROOTS.has(item.root)
}

export const FOLDER_ICON = FolderOpen
export const BOX_ICON = Box
