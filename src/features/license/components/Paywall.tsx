import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, KeyRound, Lock, Sparkles, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { IconTile } from '@/components/ui/IconTile'
import { Logo } from '@/components/ui/Logo'
import { useAppStore } from '@/store/useAppStore'
import { tDynamic } from '@/i18n'
import { useLicenseStore } from '../useLicenseStore'
import type { LicenseStatus } from '../types'

const COPY: Record<'trial_expired' | 'licensed_invalid' | 'licensed_grace_expired', { icon: typeof Lock; color: string }> = {
  trial_expired: { icon: Lock, color: '#5b6cff' },
  licensed_invalid: { icon: AlertTriangle, color: '#e5484d' },
  licensed_grace_expired: { icon: WifiOff, color: '#f5b400' },
}

function titleKey(status: LicenseStatus): string {
  if (status === 'licensed_invalid') return 'license.paywall.titles.licensedInvalid'
  if (status === 'licensed_grace_expired') return 'license.paywall.titles.licensedGraceExpired'
  return 'license.paywall.titles.trialExpired'
}

function bodyKey(status: LicenseStatus): string {
  if (status === 'licensed_invalid') return 'license.paywall.bodies.licensedInvalid'
  if (status === 'licensed_grace_expired') return 'license.paywall.bodies.licensedGraceExpired'
  return 'license.paywall.bodies.trialExpired'
}

export function Paywall() {
  const { t } = useTranslation()
  const status = useLicenseStore((s) => s.state?.status ?? 'trial_expired')
  const tamperDetected = useLicenseStore((s) => s.state?.tamperDetected ?? false)
  const activating = useLicenseStore((s) => s.activating)
  const refreshing = useLicenseStore((s) => s.refreshing)
  const activate = useLicenseStore((s) => s.activate)
  const refresh = useLicenseStore((s) => s.refresh)
  const openPurchasePage = useLicenseStore((s) => s.openPurchasePage)
  const pushToast = useAppStore((s) => s.pushToast)
  const [key, setKey] = useState('')
  const [error, setError] = useState<string | null>(null)

  const copyKey = status === 'licensed_invalid' || status === 'licensed_grace_expired' ? status : 'trial_expired'
  const { icon: Icon, color } = COPY[copyKey]

  const onActivate = async () => {
    setError(null)
    const result = await activate(key)
    if (result.ok) {
      setKey('')
      pushToast(t('license.toasts.activateSuccess'), 'success')
    } else {
      setError(result.error)
    }
  }

  return (
    <motion.div className="app-backdrop fixed inset-0 z-[90] flex items-center justify-center p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div data-tauri-drag-region className="fixed top-0 left-0 h-11 w-full" />
      <Card className="w-full max-w-[440px] !rounded-[26px] p-8 text-center">
        <div className="mb-5 flex justify-center">
          <Logo size={56} />
        </div>
        <div className="mb-4 flex justify-center">
          <IconTile icon={Icon} color={color} size="lg" />
        </div>
        <h1 className="font-display text-[20px] font-bold tracking-[-0.02em] text-ink">{tDynamic(titleKey(status))}</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{tDynamic(bodyKey(status))}</p>
        {tamperDetected && <p className="mt-2 text-[12px] text-ink-3">{t('license.paywall.tamperNotice')}</p>}

        {status === 'licensed_grace_expired' && (
          <Button variant="secondary" className="mt-5 w-full" disabled={refreshing} onClick={() => void refresh()}>
            {refreshing ? t('license.paywall.refreshing') : t('license.paywall.refreshButton')}
          </Button>
        )}

        <Button variant="primary" size="lg" className="mt-5 w-full" onClick={() => void openPurchasePage()}>
          <Sparkles size={16} /> {t('license.paywall.buyButton')}
        </Button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-line" />
          <span className="text-[11px] font-semibold tracking-[0.06em] text-ink-3 uppercase">{t('license.paywall.orDivider')}</span>
          <div className="h-px flex-1 bg-line" />
        </div>

        <div className="text-start">
          <label className="mb-1.5 block text-[12px] font-semibold text-ink-2" htmlFor="license-key-input">
            {t('license.paywall.activateLabel')}
          </label>
          <div className="flex gap-2">
            <div className="flex h-9.5 flex-1 items-center gap-2 rounded-xl bg-surface-2 px-3">
              <KeyRound size={14} className="text-ink-3" />
              <input
                id="license-key-input"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !activating && key.trim() && void onActivate()}
                placeholder={t('license.paywall.activatePlaceholder')}
                className="selectable flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3"
              />
            </div>
            <Button variant="secondary" disabled={activating || !key.trim()} onClick={() => void onActivate()}>
              {activating ? t('license.paywall.activating') : t('license.paywall.activateButton')}
            </Button>
          </div>
          {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
        </div>
      </Card>
    </motion.div>
  )
}
