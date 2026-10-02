/**
 * Illustrative storage figures for the website's demo visualizations.
 * They mirror the desktop app's built-in sample data (src/mocks) so the
 * visuals match the screenshots — they are NOT measurements or promises,
 * and every place that shows them labels them as an example.
 */
export interface DemoCategory {
  id: string
  label: string
  gb: number
  color: string
  /** Portion that typical cleanup categories could make reclaimable in this example. */
  reclaimableGb: number
  note: string
}

export const DEMO_TOTAL_GB = 256

export const DEMO_CATEGORIES: DemoCategory[] = [
  { id: 'applications', label: 'Applications', gb: 27.8, color: '#8b5cf6', reclaimableGb: 1.5, note: 'Apps plus leftovers from apps you’ve removed' },
  { id: 'documents', label: 'Documents', gb: 31.5, color: '#4f7bff', reclaimableGb: 3.2, note: 'Documents and Desktop — reviewed, never preselected' },
  { id: 'photos', label: 'Photos', gb: 26.3, color: '#f0508a', reclaimableGb: 0, note: 'Your Photos library is sized, never touched' },
  { id: 'videos', label: 'Videos', gb: 19.7, color: '#ff8a4c', reclaimableGb: 2.0, note: 'Large recordings you can review' },
  { id: 'downloads', label: 'Downloads', gb: 14.2, color: '#13b5e0', reclaimableGb: 9.6, note: 'Old installers, disk images and archives' },
  { id: 'cache', label: 'Cache', gb: 12.6, color: '#19c39a', reclaimableGb: 7.4, note: 'App and browser caches that rebuild themselves' },
  { id: 'other', label: 'Other', gb: 11.4, color: '#f5b400', reclaimableGb: 0, note: 'Music, mail, messages and other app data' },
  { id: 'system-data', label: 'System Data', gb: 34.5, color: '#9aa0bd', reclaimableGb: 0, note: 'macOS and space not attributable to a folder' },
]

export const DEMO_USED_GB = DEMO_CATEGORIES.reduce((s, c) => s + c.gb, 0)
export const DEMO_RECLAIMABLE_GB = DEMO_CATEGORIES.reduce((s, c) => s + c.reclaimableGb, 0)
export const DEMO_FREE_GB = DEMO_TOTAL_GB - DEMO_USED_GB

/** Steps of the animated scan demo, in the order Smart Clean groups them. */
export const DEMO_SCAN_STEPS = [
  { id: 'system-junk', label: 'System Junk', gb: 4.9, items: 6, safeGb: 4.9, color: '#19c39a' },
  { id: 'browser', label: 'Browser Caches', gb: 2.1, items: 2, safeGb: 2.1, color: '#13b5e0' },
  { id: 'leftovers', label: 'App Leftovers', gb: 1.5, items: 3, safeGb: 1.5, color: '#8b5cf6' },
  { id: 'logs', label: 'Logs & Crash Reports', gb: 0.4, items: 3, safeGb: 0.4, color: '#4f7bff' },
  { id: 'developer', label: 'Developer Junk', gb: 55.6, items: 9, safeGb: 33.4, color: '#6e5bff' },
  { id: 'downloads', label: 'Old Downloads', gb: 15.4, items: 11, safeGb: 0, color: '#ff8a4c' },
] as const
