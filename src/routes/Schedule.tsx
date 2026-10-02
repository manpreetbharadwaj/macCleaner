import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, CalendarClock, Camera, Check, Clapperboard, Code2, FileText, FolderHeart, Globe, Layers, Lock, Monitor, ShieldCheck, Wand2, type LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, Reveal, SectionTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { Switch } from '@/components/ui/Switch'
import { IconTile } from '@/components/ui/IconTile'
import { Modal } from '@/components/ui/Modal'
import { useAppStore } from '@/store/useAppStore'
import { formatBytes, formatDateTime } from '@/lib/format'
import type { ScheduleFrequency, ScheduleRule, StorageCategoryId } from '@/types'
import { useTranslation } from 'react-i18next'
import type { TKey } from '@/i18n'
import { formatDateLocalized } from '@/i18n/format'

/**
 * Must match src-tauri/src/auto_clean.rs's `POLICY_VERSION`. The background
 * job independently refuses to auto-clean unless the persisted consent
 * version is >= its own compiled-in constant — this copy only decides when
 * to show the consent dialog.
 */
const AUTO_CLEAN_POLICY_VERSION = 1

type Freq = 'off' | ScheduleFrequency

const CATEGORIES: { id: StorageCategoryId; label: TKey; detail: TKey; icon: LucideIcon; color: string; auto: boolean }[] = [
  { id: 'developer', label: 'scheduleScreen.categories.developer', detail: 'scheduleScreen.categories.developerDetail', icon: Code2, color: '#6e5bff', auto: true },
  { id: 'system', label: 'scheduleScreen.categories.system', detail: 'scheduleScreen.categories.systemDetail', icon: Layers, color: '#19c39a', auto: false },
  { id: 'browser', label: 'scheduleScreen.categories.browser', detail: 'scheduleScreen.categories.browserDetail', icon: Globe, color: '#13b5e0', auto: false },
]

const NEVER: { label: TKey; icon: LucideIcon }[] = [
  { label: 'breakdown.documents.label', icon: FileText },
  { label: 'breakdown.photos.label', icon: Camera },
  { label: 'breakdown.videos.label', icon: Clapperboard },
  { label: 'scheduleScreen.never.desktop', icon: Monitor },
  { label: 'scheduleScreen.never.personal', icon: FolderHeart },
]

const AUTO_CLEAN_TARGETS: TKey[] = ['items.dev.xcodeDerivedData.name', 'scheduleScreen.consent.jsCaches', 'items.dev.gradleCaches.name', 'items.dev.cocoapodsCache.name']

const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`)

/** "9:00 AM" / "09:00" / "9:00 PM" — the app language's own clock convention. */
function hourLabel(time: string) {
  const h = Number(time.slice(0, 2))
  return formatDateLocalized(new Date(2000, 0, 1, h, 0), { hour: 'numeric', minute: '2-digit' })
}

export function Schedule() {
  const { t } = useTranslation()
  const schedule = useAppStore((s) => s.schedule)
  const scheduleInstalled = useAppStore((s) => s.scheduleInstalled)
  const scanEvents = useAppStore((s) => s.scanEvents)
  const settings = useAppStore((s) => s.settings)
  const dataSource = useAppStore((s) => s.dataSource)
  const saveSchedule = useAppStore((s) => s.saveSchedule)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const [draft, setDraft] = useState<ScheduleRule | null>(schedule)
  const [dirty, setDirty] = useState(false)
  const [consentOpen, setConsentOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (schedule && !dirty) setDraft(schedule)
  }, [schedule, dirty])

  if (!draft || !settings) return null
  const d = draft
  const update = (patch: Partial<ScheduleRule>) => {
    setDraft({ ...d, ...patch })
    setDirty(true)
  }
  const freq: Freq = d.enabled ? (d.frequency === 'biweekly' ? 'weekly' : d.frequency) : 'off'
  const scheduled = scanEvents.filter((e) => e.source === 'scheduled').slice(0, 5)

  const save = async () => {
    setSaving(true)
    await saveSchedule(d)
    setSaving(false)
    setDirty(false)
  }

  return (
    <div className="pb-20">
      <PageHeader title={t('nav.schedule')} subtitle={t('scheduleScreen.subtitle')} icon={CalendarClock} color="#f5b400" />

      <div className="grid grid-cols-5 gap-5">
        <div className="col-span-3 space-y-5">
          <Reveal>
            <Card className="p-6">
              <SectionTitle title={t('scheduleScreen.howOften')} subtitle={t('scheduleScreen.howOftenSubtitle')} />
              <Segmented<Freq>
                value={freq}
                onChange={(v) => (v === 'off' ? update({ enabled: false }) : update({ enabled: true, frequency: v }))}
                options={[
                  { value: 'off', label: t('common.off') },
                  { value: 'daily', label: t('schedule.frequency.daily') },
                  { value: 'weekly', label: t('schedule.frequency.weekly') },
                  { value: 'monthly', label: t('schedule.frequency.monthly') },
                ]}
              />
              <AnimatePresence initial={false}>
                {d.enabled && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="mt-5 flex items-center gap-3">
                      <span className="text-[13px] text-ink-2">{t('scheduleScreen.at')}</span>
                      <select
                        value={d.timeOfDay}
                        onChange={(e) => update({ timeOfDay: e.target.value })}
                        className="h-9 rounded-xl border border-line-strong bg-surface px-3 text-[13px] font-semibold text-ink outline-none"
                      >
                        {HOURS.map((h) => (
                          <option key={h} value={h}>
                            {hourLabel(h)}
                          </option>
                        ))}
                      </select>
                      {schedule?.enabled && schedule.nextRunAt && !dirty && <span className="text-[12.5px] text-ink-3">{t('scheduleScreen.nextRun', { when: formatDateTime(schedule.nextRunAt) })}</span>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </Reveal>

          <Reveal delay={0.05}>
            <Card className={clsx('p-6 transition-opacity', !d.enabled && 'pointer-events-none opacity-50')}>
              <SectionTitle title={t('scheduleScreen.whenItRuns')} />
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    { mode: 'reminder', icon: Bell, color: '#4f7bff', title: t('scheduleScreen.remind'), body: t('scheduleScreen.remindBody') },
                    { mode: 'auto-clean', icon: Wand2, color: '#8b5cf6', title: t('scheduleScreen.auto'), body: t('scheduleScreen.autoBody') },
                  ] as const
                ).map((opt) => {
                  const active = d.mode === opt.mode
                  return (
                    <button
                      key={opt.mode}
                      onClick={() => {
                        if (opt.mode === 'auto-clean' && d.autoCleanConsentVersion < AUTO_CLEAN_POLICY_VERSION) setConsentOpen(true)
                        else update({ mode: opt.mode })
                      }}
                      className={clsx(
                        'relative rounded-2xl border-2 p-4 text-start transition-all',
                        active ? 'border-brand bg-brand-soft/60' : 'border-line hover:border-line-strong',
                      )}
                    >
                      {active && (
                        <motion.span layoutId="mode-check" className="absolute top-3 end-3 flex h-5 w-5 items-center justify-center rounded-full brand-gradient text-white">
                          <Check size={12} strokeWidth={3} />
                        </motion.span>
                      )}
                      <IconTile icon={opt.icon} color={opt.color} size="sm" />
                      <p className="mt-3 text-[14px] font-semibold text-ink">{opt.title}</p>
                      <p className="mt-0.5 text-[12px] leading-snug text-ink-3">{opt.body}</p>
                    </button>
                  )
                })}
              </div>
            </Card>
          </Reveal>

          <Reveal delay={0.1}>
            <Card className={clsx('p-6 transition-opacity', !d.enabled && 'pointer-events-none opacity-50')}>
              <SectionTitle title={t('scheduleScreen.eligible')} subtitle={t('scheduleScreen.eligibleSubtitle')} />
              <div className="space-y-1">
                {CATEGORIES.map((c) => (
                  <div key={c.id} className="flex items-center gap-3.5 rounded-xl px-2 py-2.5">
                    <IconTile icon={c.icon} color={c.color} size="md" />
                    <div className="flex-1">
                      <p className="text-[13.5px] font-semibold text-ink">{t(c.label)}</p>
                      <p className="text-[12px] text-ink-3">
                        {t(c.detail)} · <span className={c.auto ? 'font-semibold text-brand' : ''}>{c.auto ? t('scheduleScreen.cleanedAutomatically') : t('scheduleScreen.inReminders')}</span>
                      </p>
                    </div>
                    <Switch
                      checked={d.safeCategories.includes(c.id)}
                      onChange={(on) => update({ safeCategories: on ? [...d.safeCategories, c.id] : d.safeCategories.filter((x) => x !== c.id) })}
                      label={t(c.label)}
                    />
                  </div>
                ))}
              </div>
            </Card>
          </Reveal>
        </div>

        <div className="col-span-2 space-y-5">
          <Reveal delay={0.08}>
            <Card className="p-6">
              <SectionTitle title={t('scheduleScreen.neverRemoved')} />
              <div className="space-y-2">
                {NEVER.map((n) => (
                  <div key={n.label} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
                    <n.icon size={16} className="text-ink-3" />
                    <span className="flex-1 text-[13px] font-medium text-ink">{t(n.label)}</span>
                    <Lock size={14} className="text-mint" />
                  </div>
                ))}
              </div>
              <p className="mt-3 flex gap-2 text-[12px] text-ink-3">
                <ShieldCheck size={14} className="mt-[1px] shrink-0 text-mint" /> {t('scheduleScreen.onlyTrash')}
              </p>
            </Card>
          </Reveal>

          <Reveal delay={0.12}>
            <Card className="p-6">
              <SectionTitle title={t('scheduleScreen.status')} />
              <div className="space-y-2.5 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-ink-3">{t('scheduleScreen.backgroundJob')}</span>
                  <span className={clsx('font-semibold', scheduleInstalled ? 'text-mint' : 'text-ink-2')}>{scheduleInstalled ? t('scheduleScreen.active') : t('scheduleScreen.notInstalled')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-3">{t('scheduleScreen.lastRun')}</span>
                  <span className="font-semibold text-ink">{schedule?.lastRunAt ? formatDateTime(schedule.lastRunAt) : t('scheduleScreen.never.label')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-3">{t('settings.notifications')}</span>
                  <Switch checked={settings.notificationsEnabled} onChange={(on) => updateSettings({ notificationsEnabled: on })} label={t('settings.notifications')} />
                </div>
              </div>
              {scheduled.length > 0 && (
                <div className="mt-4 border-t border-line pt-3">
                  <p className="mb-2 text-[11.5px] font-bold tracking-wide text-ink-3 uppercase">{t('scheduleScreen.recentRuns')}</p>
                  {scheduled.map((e) => (
                    <div key={e.id} className="flex justify-between py-1 text-[12.5px]">
                      <span className="text-ink-2">{formatDateTime(e.occurredAt)}</span>
                      <span className="font-semibold text-ink">{t('scheduleScreen.found', { size: formatBytes(e.reclaimableBytes) })}</span>
                    </div>
                  ))}
                </div>
              )}
              {dataSource === 'tauri' && (
                <p className="mt-3 text-[11.5px] text-ink-3">{t('scheduleScreen.needsApplications')}</p>
              )}
            </Card>
          </Reveal>
        </div>
      </div>

      <AnimatePresence>
        {dirty && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} className="pointer-events-none fixed end-0 bottom-6 start-[248px] z-40 flex justify-center">
            <div className="glass pointer-events-auto flex items-center gap-4 rounded-[20px] border border-line py-2.5 pe-2.5 ps-5 shadow-[var(--shadow-lift)]">
              <span className="text-[13px] font-medium text-ink">{t('scheduleScreen.unsaved')}</span>
              <Button
                variant="ghost"
                onClick={() => {
                  setDraft(schedule)
                  setDirty(false)
                }}
              >
                {t('scheduleScreen.discard')}
              </Button>
              <Button variant="primary" onClick={save} disabled={saving}>
                {saving ? t('scheduleScreen.saving') : t('scheduleScreen.save')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={consentOpen} onClose={() => setConsentOpen(false)} width={500}>
        <div className="p-7">
          <IconTile icon={Wand2} color="#8b5cf6" size="lg" solid />
          <h2 className="mt-4 font-display text-[21px] font-bold tracking-[-0.02em] text-ink">{t('scheduleScreen.consent.title')}</h2>
          <p className="mt-2 text-[13.5px] text-ink-2">{t('scheduleScreen.consent.intro')}</p>
          <ul className="mt-3 space-y-1.5 text-[13px] text-ink">
            {AUTO_CLEAN_TARGETS.map((key) => (
              <li key={key} className="flex items-center gap-2">
                <Check size={14} className="text-mint" strokeWidth={3} /> {t(key)}
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl bg-surface-2 p-3.5 text-[12px] leading-relaxed text-ink-2">
            {t('scheduleScreen.consent.limits', { min: formatBytes(1e9, 0), max: formatBytes(10e9, 0), items: 50 })}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConsentOpen(false)}>
              {t('scheduleScreen.consent.keepReminders')}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                update({ mode: 'auto-clean', autoCleanConsentVersion: AUTO_CLEAN_POLICY_VERSION })
                setConsentOpen(false)
              }}
            >
              {t('scheduleScreen.consent.turnOn')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
