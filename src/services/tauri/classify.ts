import type {
  ApplicationItem,
  BrowserProfile,
  CleanupItem,
  DeveloperTool,
  DiskSummary,
  FileKind,
  SafetyLevel,
  ScanSession,
  StorageBreakdownEntry,
  StorageCategory,
  StorageCategoryId,
  UsageStatus,
} from '@/types'
import { buildInitialScanSession, CATEGORY_LABELS, DASHBOARD_CATEGORY_ORDER } from '@/mocks'
import type {
  RawAppItem,
  RawBrowserItem,
  RawDevItem,
  RawFullScanResult,
  RawScannedFile,
  RawStorageBreakdown,
} from './rawTypes'

const DAY_MS = 1000 * 60 * 60 * 24

function ageDaysFrom(ms: number | null, now: number): number {
  if (ms === null) return 0
  return Math.max(0, Math.floor((now - ms) / DAY_MS))
}


/** Names/keywords that make us treat an item as Protected regardless of any other rule. */
const PROTECTED_KEYWORDS = [
  'backup',
  'keychain',
  '1password',
  'wallet',
  '.key',
  'private key',
  'passwords',
]

function looksSensitive(name: string, path: string): boolean {
  const haystack = `${name} ${path}`.toLowerCase()
  return PROTECTED_KEYWORDS.some((kw) => haystack.includes(kw))
}

// ---------------------------------------------------------------------------
// Developer tooling
// ---------------------------------------------------------------------------

interface DevCopy {
  name: string
  nameKey?: string
  source: string
  safety: SafetyLevel
  whyItExists: string
  whatHappensIfCleaned: string
}

const DEV_COPY: Record<string, DevCopy> = {
  'xcode-derived-data': {
    name: 'Xcode DerivedData',
    nameKey: 'items.dev.xcodeDerivedData.name',
    source: 'Xcode',
    safety: 'green',
    whyItExists: 'items.dev.xcodeDerivedData.why',
    whatHappensIfCleaned: 'items.dev.xcodeDerivedData.what',
  },
  'xcode-archives': {
    name: 'Xcode Archives',
    nameKey: 'items.dev.xcodeArchives.name',
    source: 'Xcode',
    safety: 'orange',
    whyItExists: 'items.dev.xcodeArchives.why',
    whatHappensIfCleaned: 'items.dev.xcodeArchives.what',
  },
  'xcode-device-support-ios': {
    name: 'iOS Device Support',
    nameKey: 'items.dev.xcodeDeviceSupportIos.name',
    source: 'Xcode',
    safety: 'green',
    whyItExists: 'items.dev.xcodeDeviceSupportIos.why',
    whatHappensIfCleaned: 'items.dev.xcodeDeviceSupportIos.what',
  },
  'xcode-device-support-watchos': {
    name: 'watchOS Device Support',
    nameKey: 'items.dev.xcodeDeviceSupportWatchos.name',
    source: 'Xcode',
    safety: 'green',
    whyItExists: 'items.dev.xcodeDeviceSupportWatchos.why',
    whatHappensIfCleaned: 'items.dev.xcodeDeviceSupportWatchos.what',
  },
  'xcode-simulator-caches': {
    name: 'Simulator Caches',
    nameKey: 'items.dev.xcodeSimulatorCaches.name',
    source: 'Xcode',
    safety: 'green',
    whyItExists: 'items.dev.xcodeSimulatorCaches.why',
    whatHappensIfCleaned: 'items.dev.xcodeSimulatorCaches.what',
  },
  'xcode-simulator-devices': {
    name: 'Simulator Devices',
    nameKey: 'items.dev.xcodeSimulatorDevices.name',
    source: 'Xcode',
    safety: 'orange',
    whyItExists: 'items.dev.xcodeSimulatorDevices.why',
    whatHappensIfCleaned: 'items.dev.xcodeSimulatorDevices.what',
  },
  'npm-cache': {
    name: 'npm cache',
    nameKey: 'items.dev.npmCache.name',
    source: 'Node.js',
    safety: 'green',
    whyItExists: 'items.dev.npmCache.why',
    whatHappensIfCleaned: 'items.dev.npmCache.what',
  },
  'yarn-cache': {
    name: 'Yarn cache',
    nameKey: 'items.dev.yarnCache.name',
    source: 'Node.js',
    safety: 'green',
    whyItExists: 'items.dev.yarnCache.why',
    whatHappensIfCleaned: 'items.dev.yarnCache.what',
  },
  'pnpm-store': {
    name: 'pnpm store',
    nameKey: 'items.dev.pnpmStore.name',
    source: 'Node.js',
    safety: 'green',
    whyItExists: 'items.dev.pnpmStore.why',
    whatHappensIfCleaned: 'items.dev.pnpmStore.what',
  },
  // Shown for awareness only. The scanner reports Metro's location as the
  // whole system temp folder (its cache folders are scattered inside it),
  // and the native trash layer always refuses paths outside the home folder
  // — so this is marked Protected rather than offered as a cleanup that
  // could never succeed.
  'metro-cache': {
    name: 'Metro bundler cache',
    nameKey: 'items.dev.metroCache.name',
    source: 'React Native',
    safety: 'red',
    whyItExists: 'items.dev.metroCache.why',
    whatHappensIfCleaned: 'items.dev.metroCache.what',
  },
  'gradle-caches': {
    name: 'Gradle caches',
    nameKey: 'items.dev.gradleCaches.name',
    source: 'Android',
    safety: 'green',
    whyItExists: 'items.dev.gradleCaches.why',
    whatHappensIfCleaned: 'items.dev.gradleCaches.what',
  },
  'android-avd': {
    name: 'Android emulator images',
    nameKey: 'items.dev.androidAvd.name',
    source: 'Android',
    safety: 'orange',
    whyItExists: 'items.dev.androidAvd.why',
    whatHappensIfCleaned: 'items.dev.androidAvd.what',
  },
  'cocoapods-cache': {
    name: 'CocoaPods cache',
    nameKey: 'items.dev.cocoapodsCache.name',
    source: 'CocoaPods',
    safety: 'green',
    whyItExists: 'items.dev.cocoapodsCache.why',
    whatHappensIfCleaned: 'items.dev.cocoapodsCache.what',
  },
}

const TOOL_MAP: Record<string, DeveloperTool> = {
  xcode: 'xcode',
  node: 'node',
  android: 'android',
  cocoapods: 'cocoapods',
  docker: 'docker',
  general: 'general',
}

export function classifyDeveloperItems(items: RawDevItem[], now: number): CleanupItem[] {
  return items.map((item) => {
    const copy = DEV_COPY[item.kind] ?? {
      name: item.label,
      source: item.tool,
      safety: 'orange' as SafetyLevel,
      whyItExists: 'items.dev.unknown.why',
      whatHappensIfCleaned: 'items.dev.unknown.what',
    }
    const sensitive = looksSensitive(item.label, item.path)
    return {
      id: `dev:${item.path}`,
      name: copy.name,
      nameKey: copy.nameKey,
      category: 'developer',
      source: copy.source,
      tool: TOOL_MAP[item.tool] ?? 'general',
      path: item.path,
      sizeBytes: item.sizeBytes,
      ageDays: ageDaysFrom(item.modifiedMs, now),
      lastUsedLabel: 'common.unknown',
      modifiedAt: isoFrom(item.modifiedMs),
      safety: sensitive ? 'red' : copy.safety,
      whyItExists: copy.whyItExists,
      whatHappensIfCleaned: sensitive ? 'items.sensitive.devWhat' : copy.whatHappensIfCleaned,
      selected: false,
      excluded: false,
    }
  })
}

// ---------------------------------------------------------------------------
// Browsers
// ---------------------------------------------------------------------------

const BROWSER_ACCENTS: Record<string, string> = {
  safari: '#0ea5e9',
  chrome: '#f59e0b',
  edge: '#0078d4',
  firefox: '#ff7139',
}

export function classifyBrowserProfiles(items: RawBrowserItem[]): BrowserProfile[] {
  return items.map((item) => ({
    id: item.browserId as BrowserProfile['id'],
    name: item.name,
    accent: BROWSER_ACCENTS[item.browserId] ?? '#64748b',
    cacheBytes: item.cacheBytes,
    cookiesBytes: 0,
    // We deliberately never read passwords, bookmarks, autofill, or extensions —
    // `null` means "not scanned" so the UI can say that honestly instead of "0".
    passwordsCount: null,
    bookmarksCount: null,
    extensionsCount: null,
    autofillEntries: null,
    lastCleanedLabel: 'items.browser.notCleanedYet',
  }))
}

export function classifyBrowserCleanupItems(items: RawBrowserItem[], _now: number): CleanupItem[] {
  return items
    .filter((item) => item.accessible && item.cacheBytes > 0)
    .map((item) => ({
      id: `browser:${item.browserId}`,
      name: `${item.name} cache & temporary files`,
      nameKey: 'items.browser.name',
      nameParams: { browser: item.name },
      category: 'browser',
      source: item.name,
      browserId: item.browserId as CleanupItem['browserId'],
      path: item.cachePath,
      sizeBytes: item.cacheBytes,
      // Caches are continuously rewritten, so there's no single meaningful
      // "last modified" date for the aggregate folder — it's always current.
      ageDays: 0,
      lastUsedLabel: 'items.updatedRecently',
      safety: 'green',
      whyItExists: 'items.browser.why',
      whatHappensIfCleaned: 'items.browser.what',
      selected: false,
      excluded: false,
    }))
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

const ACCENT_PALETTE = ['#3b82f6', '#a855f7', '#f59e0b', '#22c55e', '#ec4899', '#06b6d4', '#ef4444', '#64748b']

function accentForName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return ACCENT_PALETTE[hash % ACCENT_PALETTE.length]
}

function usageStatusFor(daysAgo: number | null): UsageStatus {
  if (daysAgo === null) return 'unknown'
  if (daysAgo <= 7) return 'active'
  if (daysAgo <= 60) return 'infrequent'
  return 'not-used'
}

export function classifyApplications(
  items: RawAppItem[],
  systemCacheFiles: RawScannedFile[],
  now: number,
): ApplicationItem[] {
  // Best-effort, honest correlation: some app support/cache folders are named
  // after the app's bundle identifier. We only attribute size we actually
  // scanned — nothing here is estimated or invented.
  const cacheByBundleId = new Map<string, number>()
  for (const file of systemCacheFiles) {
    cacheByBundleId.set(file.name.toLowerCase(), file.sizeBytes)
  }

  return items.map((item) => {
    const daysAgo = item.lastUsedMs === null ? null : ageDaysFrom(item.lastUsedMs, now)
    const associated = item.bundleId ? cacheByBundleId.get(item.bundleId.toLowerCase()) ?? 0 : 0

    return {
      id: item.bundleId ?? item.path,
      name: item.name,
      path: item.path,
      bundleId: item.bundleId,
      version: item.version,
      sizeBytes: item.sizeBytes,
      lastUsedAt: item.lastUsedMs === null ? null : new Date(item.lastUsedMs).toISOString(),
      lastUsedDaysAgo: daysAgo,
      usageStatus: usageStatusFor(daysAgo),
      associatedCleanupBytes: associated,
      accent: accentForName(item.name),
      initial: item.name.charAt(0).toUpperCase() || '?',
    }
  })
}

// ---------------------------------------------------------------------------
// Files (Downloads / Desktop / Documents / system caches & logs)
// ---------------------------------------------------------------------------

const LARGE_THRESHOLD_BYTES = 500 * 1000 * 1000
const OLD_THRESHOLD_DAYS = 180
const INSTALLER_EXTENSIONS = new Set(['dmg', 'pkg'])
const ARCHIVE_EXTENSIONS = new Set(['zip', 'tar', 'gz', 'tgz', 'rar', '7z'])
const MEDIA_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'heic', 'gif', 'mov', 'mp4', 'm4v', 'avi', 'mkv', 'mp3', 'wav', 'aac',
])

function categoryForFile(root: RawScannedFile['root'], extension: string | null): StorageCategoryId {
  if (root === 'system-caches' || root === 'system-logs') return 'system'
  if (root === 'downloads') return 'downloads'
  if (extension && MEDIA_EXTENSIONS.has(extension)) return 'media'
  return 'documents'
}

function classifyFileKind(
  file: RawScannedFile,
  ageDays: number,
): { fileKind: FileKind | undefined; safety: SafetyLevel; why: string; consequence: string } | null {
  const ext = file.extension ?? ''

  if (file.duplicateGroup) {
    return {
      fileKind: 'duplicate',
      safety: 'orange',
      why: 'items.file.duplicate.why',
      consequence: 'items.file.duplicate.what',
    }
  }
  if (INSTALLER_EXTENSIONS.has(ext)) {
    return {
      fileKind: 'installer',
      safety: 'green',
      why: 'items.file.installer.why',
      consequence: 'items.file.installer.what',
    }
  }
  if (ARCHIVE_EXTENSIONS.has(ext)) {
    return {
      fileKind: 'archive',
      safety: 'green',
      why: 'items.file.archive.why',
      consequence: 'items.file.archive.what',
    }
  }
  if (file.sizeBytes >= LARGE_THRESHOLD_BYTES) {
    return {
      fileKind: 'large',
      safety: 'orange',
      why: 'items.file.large.why',
      consequence: 'items.file.yourFile',
    }
  }
  if (ageDays >= OLD_THRESHOLD_DAYS) {
    return {
      fileKind: 'old',
      safety: 'orange',
      why: 'items.file.old.why',
      consequence: 'items.file.yourFile',
    }
  }
  if (file.root === 'downloads') {
    return {
      fileKind: 'download',
      safety: 'orange',
      why: 'items.file.download.why',
      consequence: 'items.file.reviewFirst',
    }
  }
  return null
}

export function classifyFiles(files: RawScannedFile[], now: number): CleanupItem[] {
  const items: CleanupItem[] = []

  for (const file of files) {
    const ageDays = ageDaysFrom(file.modifiedMs, now)
    const sensitive = looksSensitive(file.name, file.path)

    if (file.root === 'system-caches' || file.root === 'system-logs') {
      items.push({
        id: `file:${file.path}`,
        name: file.name,
        category: 'system',
        source: 'macOS',
        path: file.path,
        sizeBytes: file.sizeBytes,
        ageDays,
        lastUsedLabel: 'common.unknown',
        safety: sensitive ? 'red' : 'green',
        whyItExists: file.root === 'system-logs' ? 'items.system.logsWhy' : 'items.system.cacheWhy',
        whatHappensIfCleaned: sensitive ? 'items.sensitive.systemWhat' : 'items.system.what',
        selected: false,
        excluded: false,
        root: file.root,
        extension: file.extension,
        modifiedAt: isoFrom(file.modifiedMs),
        duplicateGroup: null,
      })
      continue
    }

    const classification = classifyFileKind(file, ageDays)
    if (!classification && !sensitive) continue // not remarkable enough to surface

    const category = categoryForFile(file.root, file.extension)

    items.push({
      id: `file:${file.path}`,
      name: file.name,
      category,
      source: file.root.charAt(0).toUpperCase() + file.root.slice(1),
      fileKind: classification?.fileKind,
      path: file.path,
      sizeBytes: file.sizeBytes,
      ageDays,
      lastUsedLabel: 'common.unknown',
      safety: sensitive ? 'red' : classification?.safety ?? 'orange',
      whyItExists: sensitive ? 'items.sensitive.fileWhy' : classification?.why ?? 'items.file.found',
      whatHappensIfCleaned: sensitive ? 'items.sensitive.fileWhat' : classification?.consequence ?? 'items.file.reviewFirst',
      selected: false,
      excluded: false,
      root: file.root,
      extension: file.extension,
      modifiedAt: isoFrom(file.modifiedMs),
      duplicateGroup: file.duplicateGroup,
    })
  }

  return items
}

function isoFrom(ms: number | null): string | null {
  return ms === null ? null : new Date(ms).toISOString()
}

/**
 * Maps the native folder measurements onto the Storage screen's eight
 * buckets. Music and the rest of ~/Library (app data, mail, containers)
 * are reported together as "Other".
 */
export function buildBreakdown(raw: RawStorageBreakdown): StorageBreakdownEntry[] {
  return [
    { id: 'applications', bytes: raw.applicationsBytes },
    { id: 'documents', bytes: raw.documentsBytes },
    { id: 'photos', bytes: raw.photosBytes },
    { id: 'videos', bytes: raw.videosBytes },
    { id: 'downloads', bytes: raw.downloadsBytes },
    { id: 'cache', bytes: raw.cacheBytes },
    { id: 'other', bytes: raw.musicBytes + raw.libraryOtherBytes },
    { id: 'system-data', bytes: raw.systemDataBytes },
  ]
}

// ---------------------------------------------------------------------------
// Aggregation: categories + disk summary, honestly derived from real data
// ---------------------------------------------------------------------------

export function buildRealCategories(
  items: CleanupItem[],
  applications: ApplicationItem[],
  totalUsedBytes: number,
): StorageCategory[] {
  const scannedByCategory = new Map<StorageCategoryId, { used: number; reclaimable: number; count: number }>()

  for (const item of items) {
    if (item.excluded) continue
    const entry = scannedByCategory.get(item.category) ?? { used: 0, reclaimable: 0, count: 0 }
    entry.used += item.sizeBytes
    if (item.safety !== 'red') entry.reclaimable += item.sizeBytes
    entry.count += 1
    scannedByCategory.set(item.category, entry)
  }

  const appsUsed = applications.reduce((sum, app) => sum + app.sizeBytes, 0)
  scannedByCategory.set('applications', {
    used: appsUsed,
    reclaimable: applications
      .filter((a) => a.usageStatus === 'not-used')
      .reduce((sum, a) => sum + a.associatedCleanupBytes, 0),
    count: applications.length,
  })

  const accountedFor = Array.from(scannedByCategory.values()).reduce((sum, v) => sum + v.used, 0)
  const otherUsed = Math.max(0, totalUsedBytes - accountedFor)

  return DASHBOARD_CATEGORY_ORDER.map((id) => {
    if (id === 'other') {
      const existing = scannedByCategory.get('other')
      return {
        id,
        label: CATEGORY_LABELS[id],
        usedBytes: otherUsed + (existing?.used ?? 0),
        reclaimableBytes: existing?.reclaimable ?? 0,
        itemCount: existing?.count ?? 0,
      }
    }
    const entry = scannedByCategory.get(id)
    return {
      id,
      label: CATEGORY_LABELS[id],
      usedBytes: entry?.used ?? 0,
      reclaimableBytes: entry?.reclaimable ?? 0,
      itemCount: entry?.count ?? 0,
    }
  })
}

export function buildRealDiskSummary(
  categories: StorageCategory[],
  totalBytes: number,
  usedBytes: number,
  freeBytes: number,
  purgeableBytes: number,
  lastScanAt: string | null,
): DiskSummary {
  const reclaimableBytes = categories.reduce((sum, c) => sum + c.reclaimableBytes, 0)
  return { totalBytes, usedBytes, freeBytes, purgeableBytes, reclaimableBytes, lastScanAt }
}

export interface ClassifiedScan {
  items: CleanupItem[]
  applications: ApplicationItem[]
  browserProfiles: BrowserProfile[]
  categories: StorageCategory[]
  diskSummary: DiskSummary
  scanSession: ScanSession
  warnings: RawFullScanResult['warnings']
  overview: RawFullScanResult['overview']
  breakdown: StorageBreakdownEntry[]
}

export function classifyFullScan(raw: RawFullScanResult): ClassifiedScan {
  const now = Date.now()

  const developerItems = classifyDeveloperItems(raw.developer, now)
  const browserCleanupItems = classifyBrowserCleanupItems(raw.browsers, now)
  // ~/Library/Caches is sized one top-level folder at a time, so folders
  // like "Yarn", "CocoaPods" or "com.apple.Safari" also show up there even
  // though the developer/browser scanners already report them. Drop those
  // system-cache rows (and any folder that *contains* one, e.g. "Google"
  // around Chrome's cache) so nothing is counted or cleaned twice.
  const coveredPaths = [...developerItems, ...browserCleanupItems].map((item) => item.path)
  const fileItems = classifyFiles(raw.files, now).filter(
    (item) => item.root !== 'system-caches' || !coveredPaths.some((p) => p === item.path || p.startsWith(`${item.path}/`)),
  )
  const items = [...developerItems, ...browserCleanupItems, ...fileItems]

  const applications = classifyApplications(
    raw.applications,
    raw.files.filter((f) => f.root === 'system-caches'),
    now,
  )
  const browserProfiles = classifyBrowserProfiles(raw.browsers)

  const categories = buildRealCategories(items, applications, raw.overview.usedBytes)
  const lastScanAt = new Date(raw.scannedAtMs).toISOString()
  const diskSummary = buildRealDiskSummary(
    categories,
    raw.overview.totalBytes,
    raw.overview.usedBytes,
    raw.overview.freeBytes,
    raw.overview.purgeableBytes,
    lastScanAt,
  )
  const scanSession = buildInitialScanSession(items)

  return {
    items,
    applications,
    browserProfiles,
    categories,
    diskSummary,
    scanSession,
    warnings: raw.warnings,
    overview: raw.overview,
    breakdown: buildBreakdown(raw.breakdown),
  }
}
