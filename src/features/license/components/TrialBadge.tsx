import { NavLink } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLicenseStore } from '../useLicenseStore'
import { formatRemaining } from '../format'

/** Subtle trial countdown, shown only while a trial is active — see Sidebar.tsx. */
export function TrialBadge() {
  const { t } = useTranslation()
  const state = useLicenseStore((s) => s.state)
  if (!state || state.status !== 'trial') return null

  return (
    <NavLink
      to="/settings"
      className="flex items-center gap-2 rounded-xl border border-line bg-surface/70 px-3 py-2 text-[11.5px] font-semibold text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
    >
      <Clock size={13} className="text-brand" />
      <span className="flex-1 truncate">{t('license.trialBadge', { time: formatRemaining(state.remainingMs) })}</span>
    </NavLink>
  )
}
