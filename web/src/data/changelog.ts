import { APP, DOWNLOAD } from '@/config/site'

export interface Release {
  version: string
  /** Empty until a release date is configured (VITE_RELEASE_DATE). */
  date: string
  title: string
  summary: string
  sections: { heading: string; items: string[] }[]
}

export const RELEASES: Release[] = [
  {
    version: APP.version,
    date: DOWNLOAD.releaseDate || DOWNLOAD.buildDate,
    title: 'First release',
    summary: 'The first public version of MacBook Cleaner.',
    sections: [
      {
        heading: 'Cleanup tools',
        items: [
          'Smart Clean: one scan grouped into System Junk, Browser Caches, App Leftovers, Logs & Crash Reports, Developer Junk and Old Downloads',
          'Storage Explorer with a measured breakdown by category',
          'Large File Finder with 500 MB, 1 GB, 5 GB and 10 GB thresholds and type filters',
          'Downloads review grouped by age',
          'Duplicate Finder with full-content SHA-256 verification',
          'App Cleanup: view an app’s caches, logs and support files; clean them or uninstall the app',
          'System Junk and Developer Cleanup (Xcode, simulators, npm, Yarn, pnpm, Gradle, CocoaPods, Android emulator images)',
        ],
      },
      {
        heading: 'Performance',
        items: [
          'New Performance tab with live CPU and memory graphs, memory pressure and swap',
          'Running Apps: CPU, memory and running time per app, with helper processes grouped and a details panel',
          'Battery Health on MacBooks: charge, cycle count, maximum capacity and condition as reported by macOS',
          'Mac Info: model, chip, cores, GPU, memory, displays, macOS version and build, uptime',
          'macOS update status from macOS’s own Software Update check, with a shortcut to System Settings',
          'Mac Health summary with descriptive statuses (no invented scores)',
        ],
      },
      {
        heading: 'Automation',
        items: [
          'Scheduled Cleanup — daily, weekly or monthly — with “Remind me” and opt-in “Clean automatically” modes',
          'Native macOS notifications for reminders and summaries',
          'Optional Launch at Login',
        ],
      },
      {
        heading: 'Safety',
        items: [
          'Everything removed goes to the Trash; nothing is permanently deleted',
          'Native protection for system locations, your home folder’s main folders, and paths that look like backups, keychains or keys',
          'Personal files are never preselected and always need confirmation',
          'Scan exclusions (“never suggest this again”)',
        ],
      },
      {
        heading: 'Interface',
        items: ['Light, dark and system appearance', 'Guided first-run welcome with an optional Full Disk Access step'],
      },
    ],
  },
]
