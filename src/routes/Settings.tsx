import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, ArrowRight, Bell, CalendarClock, ChevronRight, Code2, Cpu, ExternalLink, FolderX, Gauge, HardDrive, KeyRound, Languages, Lock, MemoryStick, Monitor, Moon, Plus, Power, RefreshCw, RotateCcw, Settings as SettingsIcon, ShieldCheck, Sparkles, Sun, Trash2, WifiOff, X, type LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, Reveal } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { Segmented } from '@/components/ui/Segmented'
import { IconTile } from '@/components/ui/IconTile'
import { Logo } from '@/components/ui/Logo'
import { Modal } from '@/components/ui/Modal'
import { useAppStore } from '@/store/useAppStore'
import { tildePath } from '@/lib/format'
import { formatDateLocalized, formatPercentValue, formatUnit } from '@/i18n/format'
import type { PerformanceAlertSettings, ThemePreference } from '@/types'
import { useTranslation } from 'react-i18next'
import { languageInfo, tDynamic } from '@/i18n'
import { LanguagePicker } from '@/components/settings/LanguagePicker'
import { useSystemLanguage } from '@/i18n/useSystemLanguage'
import { useLicenseStore } from '@/features/license/useLicenseStore'
import { formatRemaining } from '@/features/license/format'

const SITE = 'https://macbookcleaner.app'

function Row({ icon, color, title, subtitle, children }: { icon: LucideIcon; color: string; title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <IconTile icon={icon} color={color} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold text-ink">{title}</p>
        {subtitle && <p className="text-[12px] text-ink-3">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function Group({ title, children, delay = 0 }: { title: string; children: ReactNode; delay?: number }) {
  return (
    <Reveal delay={delay}>
      <p className="mb-2 px-1 text-[11px] font-bold tracking-[0.08em] text-ink-3 uppercase">{title}</p>
      <Card className="divide-y divide-line">{children}</Card>
    </Reveal>
  )
}

function memoryLabel(mb: number): string {
  return mb >= 1024 ? formatUnit(mb / 1024, 'gigabyte', 0) : formatUnit(mb, 'megabyte', 0)
}

/** A disableable row of preset choices for one numeric alert threshold. */
function ThresholdPicker({ enabled, value, options, format, onToggle, onPick, icon, color, title, subtitle }: {
  enabled: boolean
  value: number
  options: number[]
  format: (n: number) => string
  onToggle: (on: boolean) => void
  onPick: (n: number) => void
  icon: LucideIcon
  color: string
  title: string
  subtitle: string
}) {
  return (
    <div>
      <Row icon={icon} color={color} title={title} subtitle={subtitle}>
        <Switch checked={enabled} onChange={onToggle} label={title} />
      </Row>
      {enabled && (
        <div className="flex flex-wrap gap-2 px-5 pb-4">
          <Segmented
            size="sm"
            value={String(value)}
            onChange={(v) => onPick(Number(v))}
            options={options.map((n) => ({ value: String(n), label: format(n) }))}
          />
        </div>
      )}
    </div>
  )
}

function ThemeCard({ value, current, onPick, label, icon: Icon }: { value: ThemePreference; current: ThemePreference; onPick: (v: ThemePreference) => void; label: string; icon: LucideIcon }) {
  const active = value === current
  const preview = (dark: boolean) => (
    <div className={clsx('flex h-full w-full gap-1 p-1.5', dark ? 'bg-[#171a2c]' : 'bg-[#f4f5fb]')}>
      <div className={clsx('w-1/4 rounded-[4px]', dark ? 'bg-[#22263f]' : 'bg-white')} />
      <div className="flex flex-1 flex-col gap-1">
        <div className="h-3 w-3/4 rounded-[3px] brand-gradient" />
        <div className={clsx('flex-1 rounded-[4px]', dark ? 'bg-[#22263f]' : 'bg-white')} />
      </div>
    </div>
  )
  return (
    <button onClick={() => onPick(value)} className="group text-center" aria-pressed={active}>
      <div className={clsx('h-[74px] w-[112px] overflow-hidden rounded-xl border-2 transition-all', active ? 'border-brand shadow-[var(--shadow-glow)]' : 'border-line group-hover:border-line-strong')}>
        {value === 'system' ? (
          <div className="flex h-full">
            <div className="w-1/2 overflow-hidden">{preview(false)}</div>
            <div className="w-1/2 overflow-hidden">{preview(true)}</div>
          </div>
        ) : (
          preview(value === 'dark')
        )}
      </div>
      <span className={clsx('mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold', active ? 'text-brand' : 'text-ink-2')}>
        <Icon size={13} /> {label}
      </span>
    </button>
  )
}

export function SettingsPage() {
  const { t } = useTranslation()
  const [languageOpen, setLanguageOpen] = useState(false)
  const systemLanguage = useSystemLanguage()
  const settings = useAppStore((s) => s.settings)
  const schedule = useAppStore((s) => s.schedule)
  const permissions = useAppStore((s) => s.permissions)
  const launchAtLogin = useAppStore((s) => s.launchAtLogin)
  const dataSource = useAppStore((s) => s.dataSource)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const setLaunchAtLogin = useAppStore((s) => s.setLaunchAtLogin)
  const requestPermission = useAppStore((s) => s.requestPermission)
  const refreshPermissions = useAppStore((s) => s.refreshPermissions)
  const openNotificationSettings = useAppStore((s) => s.openNotificationSettings)
  const resetAllData = useAppStore((s) => s.resetAllData)
  const pushToast = useAppStore((s) => s.pushToast)
  const [newExclusion, setNewExclusion] = useState('')
  const [resetOpen, setResetOpen] = useState(false)
  const license = useLicenseStore((s) => s.state)
  const licenseActivating = useLicenseStore((s) => s.activating)
  const licenseDeactivating = useLicenseStore((s) => s.deactivating)
  const licenseRefreshing = useLicenseStore((s) => s.refreshing)
  const activateLicense = useLicenseStore((s) => s.activate)
  const deactivateLicense = useLicenseStore((s) => s.deactivate)
  const refreshLicense = useLicenseStore((s) => s.refresh)
  const openPurchasePage = useLicenseStore((s) => s.openPurchasePage)
  const [licenseKeyInput, setLicenseKeyInput] = useState('')
  const [licenseError, setLicenseError] = useState<string | null>(null)
  const [deactivateOpen, setDeactivateOpen] = useState(false)

  if (!settings) return null
  const fda = permissions.find((p) => p.category === 'full-disk-access')
  const alerts = settings.performanceAlerts
  const patchAlerts = (patch: Partial<PerformanceAlertSettings>) => void updateSettings({ performanceAlerts: { ...alerts, ...patch } })

  const onActivateLicense = async () => {
    setLicenseError(null)
    const result = await activateLicense(licenseKeyInput)
    if (result.ok) {
      setLicenseKeyInput('')
      pushToast(t('license.toasts.activateSuccess'), 'success')
    } else {
      setLicenseError(result.error)
    }
  }

  const onDeactivateLicense = async () => {
    setDeactivateOpen(false)
    const result = await deactivateLicense()
    pushToast(result.ok ? t('license.toasts.deactivateSuccess') : t('license.toasts.deactivateFailed', { error: result.error }), result.ok ? 'success' : 'warning')
  }

  const addExclusion = () => {
    const path = newExclusion.trim().replace(/\/+$/, '')
    if (!path || settings.exclusions.includes(path)) return
    void updateSettings({ exclusions: [...settings.exclusions, path] })
    setNewExclusion('')
  }

  return (
    <div className="mx-auto max-w-[760px] space-y-7">
      <PageHeader title={t('nav.settings')} subtitle={t('settings.subtitle')} icon={SettingsIcon} color="#8c91aa" />

      <Group title={t('settings.appearance')}>
        <div className="flex items-center justify-between px-5 py-5">
          <div>
            <p className="text-[13.5px] font-semibold text-ink">{t('settings.theme')}</p>
            <p className="text-[12px] text-ink-3">{t('settings.themeSubtitle')}</p>
          </div>
          <div className="flex gap-4">
            <ThemeCard value="light" current={settings.theme} onPick={(theme) => updateSettings({ theme })} label={t('settings.themeLight')} icon={Sun} />
            <ThemeCard value="dark" current={settings.theme} onPick={(theme) => updateSettings({ theme })} label={t('settings.themeDark')} icon={Moon} />
            <ThemeCard value="system" current={settings.theme} onPick={(theme) => updateSettings({ theme })} label={t('settings.themeSystem')} icon={Monitor} />
          </div>
        </div>
      </Group>

      <Group title={t('settings.general')} delay={0.04}>
        <button type="button" onClick={() => setLanguageOpen(true)} className="block w-full text-start transition-colors hover:bg-surface-2" aria-haspopup="dialog">
          <Row
            icon={Languages}
            color="#4f7bff"
            title={t('settings.language')}
            subtitle={settings.language === 'system' || !settings.language ? t('settings.languageFollowsMac') : t('settings.languageChosen')}
          >
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-2">
              {settings.language === 'system' || !settings.language
                ? `${t('language.system')}${systemLanguage ? ` · ${languageInfo(systemLanguage).nativeName}` : ''}`
                : languageInfo(settings.language).nativeName}
              <ChevronRight size={16} className="rtl-flip text-ink-3" />
            </span>
          </Row>
        </button>
        <Row icon={Power} color="#5b6cff" title={t('settings.launchAtLogin')} subtitle={t('settings.launchAtLoginSubtitle')}>
          <Switch checked={launchAtLogin} onChange={(on) => setLaunchAtLogin(on)} label={t('settings.launchAtLogin')} />
        </Row>
        <Row
          icon={Bell}
          color="#f0508a"
          title={t('settings.notifications')}
          subtitle={
            <>
              {t('settings.notificationsSubtitle')}{' '}
              {dataSource === 'tauri' && (
                <button className="font-semibold text-brand" onClick={() => openNotificationSettings()}>
                  {t('settings.macNotificationSettings')}
                </button>
              )}
            </>
          }
        >
          <Switch checked={settings.notificationsEnabled} onChange={(on) => updateSettings({ notificationsEnabled: on })} label={t('settings.notifications')} />
        </Row>
        <Link to="/schedule" className="block transition-colors hover:bg-surface-2">
          <Row
            icon={CalendarClock}
            color="#f5b400"
            title={t('nav.schedule')}
            subtitle={schedule?.enabled ? t('settings.scheduleOn', { frequency: t(`schedule.frequency.${schedule.frequency}`), time: formatDateLocalized(new Date(2000, 0, 1, Number(schedule.timeOfDay.slice(0, 2)), Number(schedule.timeOfDay.slice(3, 5))), { hour: 'numeric', minute: '2-digit' }) }) : t('common.off')}
          >
            <ArrowRight size={16} className="rtl-flip text-ink-3" />
          </Row>
        </Link>
      </Group>

      <Group title={t('settings.cleanupBehavior')} delay={0.08}>
        <Row icon={Trash2} color="#19c39a" title={t('settings.moveToTrash')} subtitle={t('settings.moveToTrashSubtitle')}>
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-mint">
            <Lock size={13} /> {t('settings.always')}
          </span>
        </Row>
        <Row icon={ShieldCheck} color="#5b6cff" title={t('settings.confirmBefore')} subtitle={t('settings.confirmBeforeSubtitle')}>
          <Switch checked={settings.confirmBeforeCleanup} onChange={(on) => updateSettings({ confirmBeforeCleanup: on })} label={t('settings.confirmBefore')} />
        </Row>
        <Row icon={Code2} color="#6e5bff" title={t('settings.developer')} subtitle={t('settings.developerSubtitle')}>
          <Switch checked={settings.developerCleanupEnabled} onChange={(on) => updateSettings({ developerCleanupEnabled: on })} label={t('settings.developer')} />
        </Row>
      </Group>

      <Group title={t('settings.performanceAlerts.title')} delay={0.1}>
        <Row icon={Gauge} color="#f43f5e" title={t('settings.performanceAlerts.enabled')} subtitle={t('settings.performanceAlerts.enabledSubtitle')}>
          <Switch
            checked={settings.performanceAlerts.enabled}
            onChange={(on) => patchAlerts({ enabled: on })}
            label={t('settings.performanceAlerts.enabled')}
          />
        </Row>
        {settings.performanceAlerts.enabled && (
          <>
            <ThresholdPicker
              icon={MemoryStick}
              color="#5b6cff"
              title={t('settings.performanceAlerts.highMemory')}
              subtitle={t('settings.performanceAlerts.highMemorySubtitle')}
              enabled={alerts.highMemoryEnabled}
              value={alerts.highMemoryThresholdMb}
              options={[512, 1024, 2048, 4096]}
              format={memoryLabel}
              onToggle={(on) => patchAlerts({ highMemoryEnabled: on })}
              onPick={(highMemoryThresholdMb) => patchAlerts({ highMemoryThresholdMb })}
            />
            <ThresholdPicker
              icon={Gauge}
              color="#19c39a"
              title={t('settings.performanceAlerts.highMemoryPercent')}
              subtitle={t('settings.performanceAlerts.highMemoryPercentSubtitle')}
              enabled={alerts.highMemoryPercentEnabled}
              value={alerts.highMemoryPercentThreshold}
              options={[10, 20, 30, 50]}
              format={(n) => formatPercentValue(n, 0)}
              onToggle={(on) => patchAlerts({ highMemoryPercentEnabled: on })}
              onPick={(highMemoryPercentThreshold) => patchAlerts({ highMemoryPercentThreshold })}
            />
            <ThresholdPicker
              icon={Cpu}
              color="#f5b400"
              title={t('settings.performanceAlerts.backgroundCpu')}
              subtitle={t('settings.performanceAlerts.backgroundCpuSubtitle')}
              enabled={alerts.backgroundCpuEnabled}
              value={alerts.backgroundCpuThreshold}
              options={[30, 50, 70, 90]}
              format={(n) => formatPercentValue(n, 0)}
              onToggle={(on) => patchAlerts({ backgroundCpuEnabled: on })}
              onPick={(backgroundCpuThreshold) => patchAlerts({ backgroundCpuThreshold })}
            />
            <Row icon={AlertTriangle} color="#e5484d" title={t('settings.performanceAlerts.criticalPressure')} subtitle={t('settings.performanceAlerts.criticalPressureSubtitle')}>
              <Switch
                checked={alerts.criticalPressureEnabled}
                onChange={(on) => patchAlerts({ criticalPressureEnabled: on })}
                label={t('settings.performanceAlerts.criticalPressure')}
              />
            </Row>
          </>
        )}
      </Group>

      {license && (
        <Group title={t('settings.license.title')} delay={0.11}>
          <Row
            icon={license.status === 'licensed' ? ShieldCheck : license.status === 'trial' ? Sparkles : license.status === 'licensed_grace_expired' ? WifiOff : AlertTriangle}
            color={license.status === 'licensed' ? '#19c39a' : license.status === 'trial' ? '#5b6cff' : '#e5484d'}
            title={tDynamic(`settings.license.status.${license.status}`)}
            subtitle={
              license.status === 'trial'
                ? formatRemaining(license.remainingMs)
                : license.licenseKeyMasked
                  ? t('settings.license.keySubtitle', { key: license.licenseKeyMasked })
                  : undefined
            }
          />
          {license.status !== 'licensed' && (
            <div className="space-y-2 px-5 pb-4">
              <div className="flex gap-2">
                <div className="flex h-9.5 flex-1 items-center gap-2 rounded-xl bg-surface-2 px-3">
                  <KeyRound size={14} className="text-ink-3" />
                  <input
                    value={licenseKeyInput}
                    onChange={(e) => setLicenseKeyInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !licenseActivating && licenseKeyInput.trim() && void onActivateLicense()}
                    placeholder={t('license.paywall.activatePlaceholder')}
                    aria-label={t('license.paywall.activateLabel')}
                    className="selectable flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3"
                  />
                </div>
                <Button variant="secondary" disabled={licenseActivating || !licenseKeyInput.trim()} onClick={() => void onActivateLicense()}>
                  {licenseActivating ? t('license.paywall.activating') : t('license.paywall.activateButton')}
                </Button>
                <Button variant="primary" onClick={() => void openPurchasePage()}>
                  <Sparkles size={14} /> {t('settings.license.buyButton')}
                </Button>
              </div>
              {licenseError && <p className="text-[12px] text-danger">{licenseError}</p>}
            </div>
          )}
          {license.licenseKeyMasked && (
            <Row icon={RefreshCw} color="#5b6cff" title={t('settings.license.manage')} subtitle={t('settings.license.lastChecked', { time: license.lastValidatedAtMs ? formatDateLocalized(new Date(license.lastValidatedAtMs), { dateStyle: 'medium', timeStyle: 'short' } as Intl.DateTimeFormatOptions) : '—' })}>
              <div className="flex gap-1.5">
                <Button size="sm" variant="ghost" disabled={licenseRefreshing} onClick={() => void refreshLicense()} aria-label={t('settings.license.refreshButton')}>
                  <RefreshCw size={13} className={clsx(licenseRefreshing && 'animate-spin')} />
                </Button>
                <Button size="sm" variant="secondary" disabled={licenseDeactivating} onClick={() => setDeactivateOpen(true)}>
                  {t('settings.license.deactivateButton')}
                </Button>
              </div>
            </Row>
          )}
        </Group>
      )}

      <Modal open={deactivateOpen} onClose={() => setDeactivateOpen(false)} width={420}>
        <div className="p-7">
          <h2 className="font-display text-[18px] font-bold text-ink">{t('settings.license.deactivateConfirmTitle')}</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{t('settings.license.deactivateConfirmBody')}</p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeactivateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={() => void onDeactivateLicense()}>
              {t('settings.license.deactivateButton')}
            </Button>
          </div>
        </div>
      </Modal>

      <Group title={t('settings.exclusions')} delay={0.12}>
        <div className="px-5 py-4">
          <p className="mb-3 text-[12px] text-ink-3">{t('settings.exclusionsSubtitle')}</p>
          <div className="flex gap-2">
            <div className="flex h-9.5 flex-1 items-center gap-2 rounded-xl bg-surface-2 px-3">
              <FolderX size={15} className="text-ink-3" />
              <input
                value={newExclusion}
                onChange={(e) => setNewExclusion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addExclusion()}
                placeholder="~/Projects/client-work"
                aria-label={t('settings.exclusionsInput')}
                className="selectable flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3"
              />
            </div>
            <Button variant="secondary" onClick={addExclusion} disabled={!newExclusion.trim()}>
              <Plus size={15} /> {t('settings.add')}
            </Button>
          </div>
          <div className="mt-3 space-y-1">
            {settings.exclusions.length === 0 && <p className="py-2 text-[12.5px] text-ink-3">{t('settings.noExclusions')}</p>}
            {settings.exclusions.map((ex) => (
              <motion.div key={ex} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-2">
                <span className="selectable flex-1 truncate text-[12.5px] text-ink">{tildePath(ex)}</span>
                <button
                  className="text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger"
                  onClick={() => updateSettings({ exclusions: settings.exclusions.filter((x) => x !== ex) })}
                  aria-label={t('settings.removeExclusion', { path: ex })}
                >
                  <X size={14} />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </Group>

      <Group title={t('settings.privacy')} delay={0.16}>
        <Row
          icon={HardDrive}
          color="#13b5e0"
          title={t('permissions.fullDiskAccess.label')}
          subtitle={fda?.state === 'granted' ? t('settings.fdaGranted') : t('settings.fdaOptional')}
        >
          {fda?.state === 'granted' ? (
            <span className="text-[12px] font-semibold text-mint">{t('settings.granted')}</span>
          ) : (
            <div className="flex gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => refreshPermissions()} aria-label={t('settings.recheck')}>
                <RefreshCw size={13} />
              </Button>
              <Button size="sm" variant="secondary" onClick={() => requestPermission('full-disk-access')}>
                {t('common.openSystemSettings')}
              </Button>
            </div>
          )}
        </Row>
        <Row icon={ShieldCheck} color="#19c39a" title={t('settings.filesStay')} subtitle={t('settings.filesStaySubtitle')} />
      </Group>

      <Group title={t('settings.about')} delay={0.2}>
        <div className="flex items-center gap-4 px-5 py-5">
          <Logo size={52} />
          <div className="flex-1">
            <p className="font-display text-[16px] font-bold text-ink">MacBook Cleaner</p>
            <p className="text-[12.5px] text-ink-3">{t('apps.version', { version: __APP_VERSION__ })}</p>
          </div>
          <a href={`${SITE}/download`} target="_blank" rel="noreferrer">
            <Button variant="secondary">
              <RefreshCw size={14} /> {t('settings.checkUpdates')}
            </Button>
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3.5 text-[12.5px]">
          <a href={`${SITE}/privacy.html`} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold whitespace-nowrap text-brand hover:underline">
            {t('settings.privacyPolicy')} <ExternalLink size={12} />
          </a>
          <a href={`${SITE}/terms.html`} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold whitespace-nowrap text-brand hover:underline">
            {t('settings.terms')} <ExternalLink size={12} />
          </a>
          <div className="flex-1" />
          <button className="font-semibold whitespace-nowrap text-ink-3 hover:text-ink" onClick={() => updateSettings({ onboardingCompleted: false })}>
            {t('settings.showWelcome')}
          </button>
          <button className="flex items-center gap-1 font-semibold whitespace-nowrap text-danger" onClick={() => setResetOpen(true)}>
            <RotateCcw size={12} /> {t('settings.resetAll')}
          </button>
        </div>
      </Group>

      <LanguagePicker open={languageOpen} onClose={() => setLanguageOpen(false)} />

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} width={440}>
        <div className="p-7">
          <h2 className="font-display text-[19px] font-bold text-ink">{t('settings.resetTitle')}</h2>
          <p className="mt-2 text-[13px] text-ink-2">{t('settings.resetBody')}</p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setResetOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                setResetOpen(false)
                await resetAllData()
              }}
            >
              {t('common.reset')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
