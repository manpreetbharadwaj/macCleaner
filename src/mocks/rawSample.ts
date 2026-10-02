import type { RawAppItem, RawDevItem, RawFullScanResult, RawScannedFile } from '@/services/tauri/rawTypes'
import { GB, MB } from './seed'

/**
 * A realistic sample of what the native `run_full_scan` command returns on
 * a busy developer's 256 GB MacBook. Browser-preview mode feeds this through
 * the exact same classifier the real app uses (classifyFullScan), so every
 * screen behaves identically to the desktop build — only the input differs.
 */

export const SAMPLE_HOME = '/Users/alex'
const DAY = 24 * 60 * 60 * 1000

function ago(days: number): number {
  return Date.now() - days * DAY - 3 * 60 * 60 * 1000
}

type FileDraft = [root: RawScannedFile['root'], relPath: string, size: number, daysAgo: number, dup?: string]

const FILES: FileDraft[] = [
  // Downloads
  ['downloads', 'Downloads/Xcode_16.2.xip', 3.4 * GB, 120],
  ['downloads', 'Downloads/ubuntu-24.04-desktop-arm64.iso', 6.1 * GB, 210],
  ['downloads', 'Downloads/Docker.dmg', 640 * MB, 200],
  ['downloads', 'Downloads/GoogleChrome.dmg', 230 * MB, 95],
  ['downloads', 'Downloads/Figma-Installer.dmg', 180 * MB, 45],
  ['downloads', 'Downloads/Zoom.pkg', 95 * MB, 160],
  ['downloads', 'Downloads/node-v22.11.0.pkg', 78 * MB, 400],
  ['downloads', 'Downloads/Archive-2024-photos.zip', 2.1 * GB, 300],
  ['downloads', 'Downloads/project-assets.zip', 420 * MB, 12],
  ['downloads', 'Downloads/wallpapers.zip', 310 * MB, 33],
  ['downloads', 'Downloads/Screen Recording 2026-08-14.mov', 1.8 * GB, 48],
  ['downloads', 'Downloads/Quarterly-Report-Q2.pdf', 12 * MB, 2],
  ['downloads', 'Downloads/invoice-1042.pdf', 2.4 * MB, 0, 'dup-1'],
  ['downloads', 'Downloads/invoice-1042 (1).pdf', 2.4 * MB, 0, 'dup-1'],
  ['downloads', 'Downloads/IMG_4288.jpg', 14 * MB, 6, 'dup-2'],
  ['downloads', 'Downloads/presentation-final.key', 140 * MB, 5, 'dup-3'],
  ['downloads', 'Downloads/presentation-final (1).key', 140 * MB, 4, 'dup-3'],
  ['downloads', 'Downloads/Sample-Dataset.csv', 85 * MB, 20],
  ['downloads', 'Downloads/Onboarding Guide.pdf', 6 * MB, 9],
  // Desktop
  ['desktop', 'Desktop/IMG_4288.jpg', 14 * MB, 30, 'dup-2'],
  ['desktop', 'Desktop/Screen Recording 2026-09-28.mov', 650 * MB, 3],
  ['desktop', 'Desktop/Untitled design.mp4', 220 * MB, 15],
  // Documents
  ['documents', 'Documents/Photos Export/IMG_4288.jpg', 14 * MB, 90, 'dup-2'],
  ['documents', 'Documents/Wedding-Video-Final.mp4', 8.6 * GB, 500],
  ['documents', 'Documents/VMs/Windows11.vmdk', 24.2 * GB, 160],
  ['documents', 'Documents/Design_Draft_v3.psd', 640 * MB, 260],
  ['documents', 'Documents/Thesis.pages', 45 * MB, 700],
  ['documents', 'Documents/Taxes/2024-return-backup.pdf', 3 * MB, 400],
  // Movies
  ['movies', 'Movies/Trip to Iceland 4K.mov', 12.4 * GB, 380],
  ['movies', 'Movies/Interview-raw-A.mp4', 5.2 * GB, 60, 'dup-4'],
  ['movies', 'Movies/Interview-raw-A copy.mp4', 5.2 * GB, 59, 'dup-4'],
  // ~/Library/Caches (top-level entries)
  ['system-caches', 'Library/Caches/com.spotify.client', 1.9 * GB, 1],
  ['system-caches', 'Library/Caches/Homebrew', 1.2 * GB, 14],
  ['system-caches', 'Library/Caches/com.tinyspeck.slackmacgap', 820 * MB, 0],
  ['system-caches', 'Library/Caches/com.microsoft.teams2', 610 * MB, 210],
  ['system-caches', 'Library/Caches/com.oldvendor.photoeditor', 540 * MB, 330],
  ['system-caches', 'Library/Caches/pip', 450 * MB, 40],
  ['system-caches', 'Library/Caches/com.adobe.acc.AdobeCreativeCloud', 380 * MB, 260],
  ['system-caches', 'Library/Caches/com.apple.Music', 300 * MB, 2],
  ['system-caches', 'Library/Caches/com.figma.Desktop', 260 * MB, 4],
  ['system-caches', 'Library/Caches/Yarn', 1.4 * GB, 7],
  ['system-caches', 'Library/Caches/com.apple.Safari', 900 * MB, 0],
  // ~/Library/Logs
  ['system-logs', 'Library/Logs/DiagnosticReports', 260 * MB, 1],
  ['system-logs', 'Library/Logs/JetBrains', 120 * MB, 18],
  ['system-logs', 'Library/Logs/Slack', 45 * MB, 0],
]

const DEV: [kind: string, tool: string, label: string, rel: string, size: number, daysAgo: number][] = [
  ['xcode-derived-data', 'xcode', 'Xcode DerivedData', 'Library/Developer/Xcode/DerivedData', 18.6 * GB, 1],
  ['xcode-simulator-devices', 'xcode', 'Simulator Devices', 'Library/Developer/CoreSimulator/Devices', 12.3 * GB, 6],
  ['xcode-device-support-ios', 'xcode', 'iOS Device Support', 'Library/Developer/Xcode/iOS DeviceSupport', 6.2 * GB, 75],
  ['xcode-archives', 'xcode', 'Xcode Archives', 'Library/Developer/Xcode/Archives', 2.8 * GB, 214],
  ['gradle-caches', 'android', 'Gradle caches', '.gradle/caches', 4.8 * GB, 9],
  ['android-avd', 'android', 'Android emulator images', '.android/avd', 7.2 * GB, 96],
  ['npm-cache', 'node', 'npm cache', '.npm/_cacache', 1.4 * GB, 0],
  ['yarn-cache', 'node', 'Yarn cache', 'Library/Caches/Yarn', 1.4 * GB, 7],
  ['cocoapods-cache', 'cocoapods', 'CocoaPods cache', 'Library/Caches/CocoaPods', 0.9 * GB, 30],
  ['metro-cache', 'node', 'Metro bundler cache', '../../private/var/folders/xy/T', 0.6 * GB, 2],
]

const APPS: [name: string, bundleId: string, size: number, lastUsedDays: number | null, version: string][] = [
  ['Xcode', 'com.apple.dt.Xcode', 14.2 * GB, 1, '16.2'],
  ['Android Studio', 'com.google.android.studio', 3.8 * GB, 96, '2025.1'],
  ['Docker', 'com.docker.docker', 1.8 * GB, 140, '4.36.0'],
  ['Blender', 'org.blenderfoundation.blender', 1.1 * GB, 220, '4.3.2'],
  ['Steam', 'com.valvesoftware.steam', 0.9 * GB, 340, '1.0'],
  ['Google Chrome', 'com.google.Chrome', 650 * MB, 0, '131.0'],
  ['Visual Studio Code', 'com.microsoft.VSCode', 600 * MB, 0, '1.96.0'],
  ['Slack', 'com.tinyspeck.slackmacgap', 420 * MB, 0, '4.41.105'],
  ['Figma', 'com.figma.Desktop', 380 * MB, 4, '124.6'],
  ['Spotify', 'com.spotify.client', 310 * MB, 2, '1.2.52'],
  ['Zoom', 'us.zoom.xos', 310 * MB, 30, '6.3.0'],
  ['Notion', 'notion.id', 260 * MB, 3, '4.2.0'],
  ['GarageBand', 'com.apple.garageband10', 2.9 * GB, 300, '10.4.11'],
  ['Safari', 'com.apple.Safari', 140 * MB, 0, '18.2'],
  ['The Unarchiver', 'cx.c3.theunarchiver', 45 * MB, null, '4.3.8'],
]

function file([root, rel, size, daysAgo, dup]: FileDraft): RawScannedFile {
  const name = rel.split('/').pop()!
  const dot = name.lastIndexOf('.')
  const isFile = root !== 'system-caches' && root !== 'system-logs'
  return {
    name,
    path: `${SAMPLE_HOME}/${rel}`,
    sizeBytes: Math.round(size),
    modifiedMs: ago(daysAgo),
    accessedMs: isFile ? ago(daysAgo) : null,
    extension: isFile && dot > 0 ? name.slice(dot + 1).toLowerCase() : null,
    root,
    duplicateGroup: dup ?? null,
  }
}

export function buildSampleScan(removedPaths: Set<string>): RawFullScanResult {
  const files = FILES.map(file).filter((f) => !removedPaths.has(f.path))
  const developer: RawDevItem[] = DEV.map(([kind, tool, label, rel, size, daysAgo]) => ({
    kind,
    tool,
    label,
    path: `${SAMPLE_HOME}/${rel}`,
    sizeBytes: Math.round(size),
    modifiedMs: ago(daysAgo),
  })).filter((d) => !removedPaths.has(d.path))
  const applications: RawAppItem[] = APPS.map(([name, bundleId, size, last, version]) => ({
    name,
    path: `/Applications/${name}.app`,
    sizeBytes: Math.round(size),
    version,
    bundleId,
    lastUsedMs: last === null ? null : ago(last),
  })).filter((a) => !removedPaths.has(a.path))

  const browsers = [
    { browserId: 'safari', name: 'Safari', cacheBytes: 900 * MB, accessible: true, cachePath: `${SAMPLE_HOME}/Library/Caches/com.apple.Safari` },
    { browserId: 'chrome', name: 'Chrome', cacheBytes: 1.2 * GB, accessible: true, cachePath: `${SAMPLE_HOME}/Library/Caches/Google/Chrome` },
  ].filter((b) => !removedPaths.has(b.cachePath))

  const removedBytes = [...FILES.map(file), ...DEV.map(([, , , rel, size]) => ({ path: `${SAMPLE_HOME}/${rel}`, sizeBytes: size }))]
    .filter((f) => removedPaths.has(f.path))
    .reduce((sum, f) => sum + f.sizeBytes, 0)

  const total = 256 * GB
  const used = 178 * GB - removedBytes
  const appsBytes = applications.reduce((s, a) => s + a.sizeBytes, 0)
  const breakdown = {
    applicationsBytes: appsBytes,
    documentsBytes: 31.5 * GB,
    photosBytes: 26.3 * GB,
    videosBytes: 19.7 * GB,
    musicBytes: 4.2 * GB,
    downloadsBytes: 14.2 * GB,
    cacheBytes: 12.6 * GB,
    libraryOtherBytes: 7.2 * GB,
    systemDataBytes: 0,
  }
  const attributed = Object.values(breakdown).reduce((s, v) => s + v, 0)
  breakdown.systemDataBytes = Math.max(0, used - attributed)

  return {
    overview: {
      totalBytes: total,
      usedBytes: used,
      freeBytes: total - used,
      purgeableBytes: 6.4 * GB,
      volumeName: 'Macintosh HD',
      homeDir: SAMPLE_HOME,
      username: 'alex',
    },
    files,
    developer,
    browsers,
    applications,
    warnings: [],
    breakdown,
    scannedAtMs: Date.now(),
  }
}
