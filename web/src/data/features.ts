import {
  Activity,
  AppWindow,
  BatteryMedium,
  Cpu,
  Info,
  Laptop,
  MemoryStick,
  MonitorCog,
  BrushCleaning,
  CalendarClock,
  ChartPie,
  Code2,
  Copy,
  Download,
  HardDrive,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

/**
 * Every feature listed here exists in the desktop app (src/routes/* and
 * src-tauri/src/*). Before adding one, confirm it ships — the site must
 * never advertise anything the app doesn't do.
 */
export interface Feature {
  id: string
  title: string
  summary: string
  icon: LucideIcon
  color: string
}

export const CORE_FEATURES: Feature[] = [
  {
    id: 'smart-clean',
    title: 'Smart Clean',
    summary: 'One scan groups caches, logs, app leftovers, developer junk and old downloads into clear categories — Safe items preselected, everything else waits for you.',
    icon: Sparkles,
    color: '#8b5cf6',
  },
  {
    id: 'storage',
    title: 'Storage Explorer',
    summary: 'See what’s really using your disk — Applications, Documents, Photos, Videos, Downloads, Cache and System Data — measured from your actual folders.',
    icon: ChartPie,
    color: '#13b5e0',
  },
  {
    id: 'large-files',
    title: 'Large File Finder',
    summary: 'Surface files over 500 MB, 1 GB, 5 GB or 10 GB. Filter by type, sort by size or age, preview with Quick Look.',
    icon: HardDrive,
    color: '#ff8a4c',
  },
  {
    id: 'downloads',
    title: 'Downloads Review',
    summary: 'Old installers, disk images and archives, grouped by age — from today to older than 90 days. Nothing is ever preselected.',
    icon: Download,
    color: '#13b5e0',
  },
  {
    id: 'duplicates',
    title: 'Duplicate Finder',
    summary: 'Exact copies confirmed with a full-content SHA-256 checksum. Keep the newest or oldest — at least one copy always stays.',
    icon: Copy,
    color: '#f0508a',
  },
  {
    id: 'apps',
    title: 'App Cleanup',
    summary: 'See an app’s full footprint — caches, logs, support files, preferences — then clean its data or uninstall it. Apple apps are protected.',
    icon: AppWindow,
    color: '#6e5bff',
  },
  {
    id: 'system-junk',
    title: 'System & Developer Junk',
    summary: 'Clear caches and logs that rebuild themselves, plus Xcode, simulator, npm, Yarn, pnpm, Gradle and CocoaPods caches.',
    icon: BrushCleaning,
    color: '#19c39a',
  },
  {
    id: 'schedule',
    title: 'Scheduled Cleanup',
    summary: 'Daily, weekly or monthly background checks that remind you when there’s something worth cleaning — or, with your consent, clear developer caches.',
    icon: CalendarClock,
    color: '#f5b400',
  },
]

/**
 * The Performance tab (src/features/performance in the app). Everything is
 * read locally from macOS; nothing is uploaded.
 */
export const MONITOR_FEATURES: Feature[] = [
  { id: 'cpu', title: 'CPU Monitoring', summary: 'Live CPU usage with a 60-second graph, split into user, system and idle time.', icon: Cpu, color: '#5b6cff' },
  { id: 'memory', title: 'Memory Usage', summary: 'Used and available RAM, memory pressure, compressed memory and swap — explained in plain language.', icon: MemoryStick, color: '#8b5cf6' },
  { id: 'running-apps', title: 'Running Apps', summary: 'See which apps use the most memory and CPU, and how long each has been running.', icon: Activity, color: '#f43f5e' },
  { id: 'battery', title: 'Battery Health', summary: 'Charge, cycle count, maximum capacity and condition, as reported by macOS. MacBooks only.', icon: BatteryMedium, color: '#19c39a' },
  { id: 'mac-info', title: 'Mac Information', summary: 'Model, chip, cores, GPU, memory, displays and uptime in one place.', icon: Laptop, color: '#13b5e0' },
  { id: 'storage-status', title: 'Storage Status', summary: 'Used, available and potentially recoverable space, one click from the cleaner.', icon: HardDrive, color: '#ff8a4c' },
  { id: 'macos', title: 'macOS Information', summary: 'Version, build and whether macOS’s own update check found an update — with a shortcut to Software Update.', icon: MonitorCog, color: '#6e5bff' },
]

export interface FeatureDeepDive {
  id: string
  eyebrow: string
  title: string
  body: string
  points: string[]
  icon: LucideIcon
  color: string
  screen: string
  alt: string
}

export const FEATURE_DEEP_DIVES: FeatureDeepDive[] = [
  {
    id: 'smart-clean',
    eyebrow: 'Smart Clean',
    title: 'One scan. Clear categories. Your call.',
    body: 'Smart Clean checks your caches, logs, app leftovers, developer tools and Downloads in one pass, then sorts everything into six plain-language groups. Each item says why it exists and what happens if you remove it.',
    points: [
      'System Junk, Browser Caches, App Leftovers, Logs & Crash Reports, Developer Junk and Old Downloads',
      'Safe items start selected; Review items and your own files never do',
      'Expand any group to see — and untick — every single item',
    ],
    icon: Sparkles,
    color: '#8b5cf6',
    screen: 'results',
    alt: 'Smart Clean results grouped into System Junk, Browser Caches, App Leftovers, Logs, Developer Junk and Old Downloads',
  },
  {
    id: 'storage',
    eyebrow: 'Storage Explorer',
    title: 'Know where your space went.',
    body: 'MacBook Cleaner measures your real folders and draws them as one storage ring. Sizes use decimal gigabytes, the same way macOS reports storage, and space that can’t be attributed to a folder is labeled honestly as System Data.',
    points: [
      'Applications, Documents, Photos, Videos, Downloads, Cache, Other and System Data',
      'App-managed libraries like Photos are sized as a whole, never picked apart',
      'Free space is read the same way macOS’s own Storage settings read it',
    ],
    icon: ChartPie,
    color: '#13b5e0',
    screen: 'storage',
    alt: 'Storage screen showing a colored ring broken down by category',
  },
  {
    id: 'large-files',
    eyebrow: 'Large File Finder',
    title: 'Find the forgotten gigabytes.',
    body: 'Old screen recordings, virtual machine images, installers you meant to delete. Large File Finder looks through Downloads, Desktop, Documents and Movies and lists the biggest files first.',
    points: [
      'Size thresholds: 500 MB, 1 GB, 5 GB and 10 GB',
      'Filter by videos, disk images, archives, installers or documents',
      'Quick Look and Reveal in Finder before you decide',
    ],
    icon: HardDrive,
    color: '#ff8a4c',
    screen: 'large-files',
    alt: 'Large Files list filtered to files over 500 MB',
  },
  {
    id: 'downloads',
    eyebrow: 'Downloads',
    title: 'A Downloads folder you can actually read.',
    body: 'Downloads are grouped by age — Today, This Week, This Month, older than 30 days and older than 90 days — with quick views for installers and disk images, archives, duplicate downloads and large downloads.',
    points: [
      'Installers and disk images you’ve already used are easy to spot',
      'These are your files: nothing in Downloads is ever preselected',
      'Every removal asks for confirmation',
    ],
    icon: Download,
    color: '#13b5e0',
    screen: 'downloads',
    alt: 'Downloads screen with files grouped by age',
  },
  {
    id: 'duplicates',
    eyebrow: 'Duplicate Finder',
    title: 'Same file, three times? Keep one.',
    body: 'Duplicates in Downloads, Desktop, Documents and Movies are matched by exact size, narrowed with a quick fingerprint, then confirmed by hashing the full contents — so “looks similar” never counts as a duplicate.',
    points: [
      'Keep newest or keep oldest across every set in one click',
      'You can never select every copy of a file — one always stays',
      'All checks run on your Mac',
    ],
    icon: Copy,
    color: '#f0508a',
    screen: 'duplicates',
    alt: 'Duplicate files grouped into sets with wasted space per set',
  },
  {
    id: 'apps',
    eyebrow: 'App Cleanup',
    title: 'Uninstall apps — and what they leave behind.',
    body: 'Pick an app to see its real footprint: the app bundle plus its caches, logs, application support files, preferences, containers, saved state and web data. Clean just the data, or move the whole app to the Trash.',
    points: [
      'Sort apps by size, name or least recently used',
      'Apple’s own apps — and MacBook Cleaner itself — can’t be uninstalled',
      'Only apps in /Applications or ~/Applications are accepted',
    ],
    icon: AppWindow,
    color: '#6e5bff',
    screen: 'apps',
    alt: 'App Cleanup showing an app’s caches, logs and preferences',
  },
  {
    id: 'system-junk',
    eyebrow: 'System & Developer Junk',
    title: 'Caches that rebuild themselves. Gone.',
    body: 'System Junk lists app caches and logs from your Library, split into Safe to Clean and Review Recommended. Turn on Developer Cleanup to include heavy build and package caches.',
    points: [
      'Xcode DerivedData, Archives, iOS & watchOS Device Support, Simulator caches and devices',
      'npm, Yarn, pnpm, Gradle, CocoaPods caches and Android emulator images',
      'Each item explains what rebuilding it will cost you',
    ],
    icon: Code2,
    color: '#19c39a',
    screen: 'system-junk',
    alt: 'System Junk screen with Safe to Clean and Review Recommended sections',
  },
  {
    id: 'schedule',
    eyebrow: 'Scheduled Cleanup',
    title: 'Stay tidy without thinking about it.',
    body: 'Choose daily, weekly or monthly and a time of day. MacBook Cleaner checks quietly in the background — no window opens — and either reminds you, or cleans a fixed list of developer caches if you’ve explicitly allowed it.',
    points: [
      'Remind me: a notification when there’s enough to clean or space is running low',
      'Clean automatically: only six developer caches, at least 1 GB, capped at 10 GB and 50 items per run',
      'Documents, Photos, Videos, Desktop and personal folders are never removed automatically',
    ],
    icon: CalendarClock,
    color: '#f5b400',
    screen: 'schedule',
    alt: 'Scheduled Cleanup settings with frequency, mode and eligible categories',
  },
]

export const MONITOR_DEEP_DIVES: FeatureDeepDive[] = [
  {
    id: 'performance',
    eyebrow: 'Performance',
    title: 'Your Mac at a glance — live.',
    body: 'The Performance tab shows CPU, memory, storage and battery in one dashboard, with live 60-second graphs and a plain-language Mac Health summary. Every status comes straight from macOS; there’s no made-up “health score”.',
    points: [
      'Live CPU usage split into user, system and idle time',
      'Memory used, available, compressed and swap — plus macOS’s own memory pressure',
      'Updates every few seconds while you’re looking, and pauses completely when you’re not',
    ],
    icon: Activity,
    color: '#f43f5e',
    screen: 'performance',
    alt: 'Performance dashboard with CPU, memory, storage and battery gauges and a Mac Health summary',
  },
  {
    id: 'running-apps',
    eyebrow: 'Running Apps',
    title: 'See what’s using your memory and CPU.',
    body: 'Running Apps lists the apps in your Dock with their CPU use, memory and how long they’ve been running. Helper processes are counted with their app, so a browser’s many tabs add up to one honest number.',
    points: [
      'Sort by CPU, memory, running time or name',
      'Switch between apps, background processes or everything',
      'Click any app for details: launch time, threads, process ID and location',
    ],
    icon: Activity,
    color: '#5b6cff',
    screen: 'performance-apps',
    alt: 'Running Apps list sorted by memory with CPU and running time',
  },
  {
    id: 'battery',
    eyebrow: 'Battery Health',
    title: 'Understand your battery.',
    body: 'On MacBooks, see the charge, cycle count, maximum capacity, power source and condition — the same values System Settings uses. On desktop Macs, the battery section simply doesn’t appear.',
    points: [
      'Cycle count, with the design cycle count when the battery reports one',
      'Maximum capacity and condition exactly as macOS reports them',
      'Information only — no app can repair or restore a battery',
    ],
    icon: BatteryMedium,
    color: '#19c39a',
    screen: 'performance-battery',
    alt: 'Battery Health screen showing charge, maximum capacity and cycle count',
  },
  {
    id: 'mac-info',
    eyebrow: 'Mac Info',
    title: 'Everything important about your Mac.',
    body: 'Model, chip, CPU and GPU cores, memory, storage, displays, macOS version and build, and how long your Mac has been running — collected once and shown in one tidy place.',
    points: [
      'macOS update status from macOS’s own automatic check, with a shortcut to Software Update',
      'Your serial number is never read',
      'All of it stays on your Mac',
    ],
    icon: Info,
    color: '#13b5e0',
    screen: 'performance-mac',
    alt: 'Mac Info screen listing hardware details and macOS version',
  },
]
