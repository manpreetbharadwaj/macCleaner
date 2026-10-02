import { Lock, ShieldCheck, Eye } from 'lucide-react'
import { clsx } from 'clsx'
import { useTranslation } from 'react-i18next'
import type { SafetyLevel } from '@/types'

const META: Record<SafetyLevel, { className: string; icon: typeof Lock }> = {
  green: { className: 'bg-mint-soft text-mint', icon: ShieldCheck },
  orange: { className: 'bg-sun-soft text-sun', icon: Eye },
  red: { className: 'bg-danger-soft text-danger', icon: Lock },
}

export function SafetyPill({ level, className }: { level: SafetyLevel; className?: string }) {
  const { t } = useTranslation()
  const m = META[level]
  const Icon = m.icon
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[11px] font-semibold', m.className, className)}>
      <Icon size={11} strokeWidth={2.5} />
      {t(`safety.${level}`)}
    </span>
  )
}
