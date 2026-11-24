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
import { useTranslation } from 'react-i18next'

/**
 * Every feature listed here exists in the desktop app (src/routes/* and
 * src-tauri/src/*). Before adding one, confirm it ships — the site must
 * never advertise anything the app doesn't do. Translatable copy
 * (title/summary/body/points/eyebrow/alt) lives in locales/<lang>/features.json,
 * keyed by `id` — see the hooks below.
 */
export interface Feature {
  id: string
  title: string
  summary: string
  icon: LucideIcon
  color: string
}

const CORE_FEATURE_META: { id: string; icon: LucideIcon; color: string }[] = [
  { id: 'smart-clean', icon: Sparkles, color: '#8b5cf6' },
  { id: 'storage', icon: ChartPie, color: '#13b5e0' },
  { id: 'large-files', icon: HardDrive, color: '#ff8a4c' },
  { id: 'downloads', icon: Download, color: '#13b5e0' },
  { id: 'duplicates', icon: Copy, color: '#f0508a' },
  { id: 'apps', icon: AppWindow, color: '#6e5bff' },
  { id: 'system-junk', icon: BrushCleaning, color: '#19c39a' },
  { id: 'schedule', icon: CalendarClock, color: '#f5b400' },
]

const MONITOR_FEATURE_META: { id: string; icon: LucideIcon; color: string }[] = [
  { id: 'cpu', icon: Cpu, color: '#5b6cff' },
  { id: 'memory', icon: MemoryStick, color: '#8b5cf6' },
  { id: 'running-apps', icon: Activity, color: '#f43f5e' },
  { id: 'battery', icon: BatteryMedium, color: '#19c39a' },
  { id: 'mac-info', icon: Laptop, color: '#13b5e0' },
  { id: 'storage-status', icon: HardDrive, color: '#ff8a4c' },
  { id: 'macos', icon: MonitorCog, color: '#6e5bff' },
]

export function useCoreFeatures(): Feature[] {
  const { t } = useTranslation('features')
  return CORE_FEATURE_META.map((f) => ({ ...f, title: t(`cards.core.${f.id}.title`), summary: t(`cards.core.${f.id}.summary`) }))
}

export function useMonitorFeatures(): Feature[] {
  const { t } = useTranslation('features')
  return MONITOR_FEATURE_META.map((f) => ({ ...f, title: t(`cards.monitor.${f.id}.title`), summary: t(`cards.monitor.${f.id}.summary`) }))
}

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

const DEEP_DIVE_META: { id: string; icon: LucideIcon; color: string; screen: string }[] = [
  { id: 'smart-clean', icon: Sparkles, color: '#8b5cf6', screen: 'results' },
  { id: 'storage', icon: ChartPie, color: '#13b5e0', screen: 'storage' },
  { id: 'large-files', icon: HardDrive, color: '#ff8a4c', screen: 'large-files' },
  { id: 'downloads', icon: Download, color: '#13b5e0', screen: 'downloads' },
  { id: 'duplicates', icon: Copy, color: '#f0508a', screen: 'duplicates' },
  { id: 'apps', icon: AppWindow, color: '#6e5bff', screen: 'apps' },
  { id: 'system-junk', icon: Code2, color: '#19c39a', screen: 'system-junk' },
  { id: 'schedule', icon: CalendarClock, color: '#f5b400', screen: 'schedule' },
]

const MONITOR_DEEP_DIVE_META: { id: string; icon: LucideIcon; color: string; screen: string }[] = [
  { id: 'performance', icon: Activity, color: '#f43f5e', screen: 'performance' },
  { id: 'running-apps', icon: Activity, color: '#5b6cff', screen: 'performance-apps' },
  { id: 'battery', icon: BatteryMedium, color: '#19c39a', screen: 'performance-battery' },
  { id: 'mac-info', icon: Info, color: '#13b5e0', screen: 'performance-mac' },
]

function useDeepDives(meta: typeof DEEP_DIVE_META, group: 'deepDives' | 'monitorDeepDives'): FeatureDeepDive[] {
  const { t } = useTranslation('features')
  return meta.map((f) => ({
    ...f,
    eyebrow: t(`${group}.${f.id}.eyebrow`),
    title: t(`${group}.${f.id}.title`),
    body: t(`${group}.${f.id}.body`),
    alt: t(`${group}.${f.id}.alt`),
    points: t(`${group}.${f.id}.points`, { returnObjects: true }) as string[],
  }))
}

export function useFeatureDeepDives(): FeatureDeepDive[] {
  return useDeepDives(DEEP_DIVE_META, 'deepDives')
}

export function useMonitorDeepDives(): FeatureDeepDive[] {
  return useDeepDives(MONITOR_DEEP_DIVE_META, 'monitorDeepDives')
}
