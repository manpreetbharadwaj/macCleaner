import type { ScheduleRule, Settings } from '@/types'

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  language: 'system',
  permanentDeleteEnabled: false,
  exclusions: [],
  notificationsEnabled: true,
  analyticsOptIn: false,
  developerCleanupEnabled: true,
  confirmBeforeCleanup: true,
  onboardingCompleted: false,
}

export const DEFAULT_SCHEDULE: ScheduleRule = {
  enabled: false,
  frequency: 'weekly',
  mode: 'reminder',
  timeOfDay: '09:00',
  safeCategories: ['developer', 'system', 'browser'],
  thresholdFreeGb: 40,
  thresholdReclaimableGb: 5,
  emailSummaryEnabled: false,
  lastRunAt: null,
  nextRunAt: null,
  autoCleanConsentVersion: 0,
}
