import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Clapperboard, Download, FolderLock, HardDrive, Layers, Lock, ShieldCheck, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { IconTile } from '@/components/ui/IconTile'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store/useAppStore'
import { formatBytes } from '@/lib/format'
import type { TKey } from '@/i18n'

function Spark({ className, size = 22, color = '#fff', delay = 0 }: { className: string; size?: number; color?: string; delay?: number }) {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`absolute ${className}`}
      animate={{ scale: [0.8, 1.15, 0.8], opacity: [0.6, 1, 0.6], rotate: [0, 20, 0] }}
      transition={{ duration: 3, repeat: Infinity, delay }}
    >
      <path d="M12 0 Q13.4 10.6 24 12 Q13.4 13.4 12 24 Q10.6 13.4 0 12 Q10.6 10.6 12 0Z" fill={color} />
    </motion.svg>
  )
}

function MeetArt() {
  return (
    <div className="relative flex h-full items-center justify-center">
      <motion.div className="absolute h-72 w-72 rounded-full border border-white/25" animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 4, repeat: Infinity }} />
      <motion.div className="absolute h-96 w-96 rounded-full border border-white/15" animate={{ scale: [1.05, 1, 1.05] }} transition={{ duration: 5, repeat: Infinity }} />
      <motion.div initial={{ scale: 0.6, rotate: -8, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 14 }}>
        <Logo size={168} />
      </motion.div>
      <Spark className="top-[22%] start-[24%]" size={26} color="#7df9e0" />
      <Spark className="end-[22%] bottom-[26%]" size={20} delay={0.8} />
      <Spark className="top-[30%] end-[26%]" size={14} delay={1.4} />
    </div>
  )
}

function FloatingChip({ icon, color, label, size, className, delay }: { icon: typeof Layers; color: string; label: string; size: string; className: string; delay: number }) {
  return (
    <motion.div
      className={`absolute flex items-center gap-2.5 rounded-2xl bg-white/95 py-2 pe-4 ps-2 shadow-[0_14px_30px_-12px_rgba(20,10,80,0.45)] ${className}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: [0, -6, 0] }}
      transition={{ opacity: { delay, duration: 0.4 }, y: { delay, duration: 4, repeat: Infinity, ease: 'easeInOut' } }}
    >
      <IconTile icon={icon} color={color} size="sm" solid />
      <div className="leading-tight">
        <p className="text-[12px] font-semibold text-[#141629]">{label}</p>
        <p className="text-[11px] text-[#8c91aa]">{size}</p>
      </div>
    </motion.div>
  )
}

function SpaceArt() {
  const { t } = useTranslation()
  const segs = [
    ['#7df9e0', 0.22],
    ['#ffffff', 0.3],
    ['#ffb38a', 0.18],
    ['#ff9fc3', 0.12],
  ] as const
  const r = 92
  const c = 2 * Math.PI * r
  let off = 0
  return (
    <div className="relative flex h-full items-center justify-center">
      <svg width="240" height="240" className="-rotate-90">
        <circle cx="120" cy="120" r={r} stroke="rgba(255,255,255,0.18)" strokeWidth="22" fill="none" />
        {segs.map(([color, pct], i) => {
          const len = pct * c
          const el = (
            <motion.circle
              key={i}
              cx="120"
              cy="120"
              r={r}
              stroke={color}
              strokeWidth="22"
              fill="none"
              initial={{ strokeDasharray: `0 ${c}` }}
              animate={{ strokeDasharray: `${len - 4} ${c}` }}
              style={{ strokeDashoffset: -off }}
              transition={{ duration: 1, delay: 0.2 + i * 0.15 }}
            />
          )
          off += len
          return el
        })}
      </svg>
      <FloatingChip icon={HardDrive} color="#ff8a4c" label={t('onboarding.chips.largeFiles')} size={formatBytes(24.8e9)} className="top-[16%] start-[6%]" delay={0.3} />
      <FloatingChip icon={Download} color="#13b5e0" label={t('onboarding.chips.oldDownloads')} size={formatBytes(9.6e9)} className="top-[22%] end-[4%]" delay={0.5} />
      <FloatingChip icon={Layers} color="#19c39a" label={t('onboarding.chips.systemJunk')} size={formatBytes(5.1e9)} className="bottom-[18%] start-[10%]" delay={0.7} />
      <FloatingChip icon={Clapperboard} color="#f0508a" label={t('onboarding.chips.appLeftovers')} size={formatBytes(1.5e9)} className="end-[8%] bottom-[14%]" delay={0.9} />
    </div>
  )
}

function SafeArt() {
  const { t } = useTranslation()
  return (
    <div className="relative flex h-full items-center justify-center">
      <motion.div
        className="flex h-40 w-40 items-center justify-center rounded-[44px] bg-white/95 text-[#19c39a] shadow-[0_30px_60px_-20px_rgba(20,10,80,0.55)]"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 14 }}
      >
        <ShieldCheck size={84} strokeWidth={1.6} />
      </motion.div>
      <FloatingChip icon={Undo2} color="#19c39a" label={t('onboarding.chips.movedToTrash')} size={t('onboarding.chips.alwaysRecoverable')} className="top-[18%] start-[8%]" delay={0.4} />
      <FloatingChip icon={Lock} color="#8b5cf6" label={t('onboarding.chips.personalFiles')} size={t('onboarding.chips.neverAutoSelected')} className="end-[6%] bottom-[20%]" delay={0.7} />
      <Spark className="top-[20%] end-[22%]" size={22} color="#7df9e0" />
    </div>
  )
}

function PermissionArt() {
  return (
    <div className="relative flex h-full items-center justify-center">
      <motion.div
        className="flex h-40 w-40 items-center justify-center rounded-[44px] bg-white/95 text-[#6e5bff] shadow-[0_30px_60px_-20px_rgba(20,10,80,0.55)]"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 14 }}
      >
        <FolderLock size={80} strokeWidth={1.6} />
      </motion.div>
      <Spark className="top-[24%] start-[26%]" size={18} color="#7df9e0" />
      <Spark className="end-[24%] bottom-[24%]" size={24} delay={0.6} />
    </div>
  )
}

interface Step {
  title: TKey
  body: TKey
  art: ReactNode
}

const STEPS: Step[] = [
  { title: 'onboarding.meet.title', body: 'onboarding.meet.body', art: <MeetArt /> },
  { title: 'onboarding.space.title', body: 'onboarding.space.body', art: <SpaceArt /> },
  { title: 'onboarding.safe.title', body: 'onboarding.safe.body', art: <SafeArt /> },
]

export function Onboarding() {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const completeOnboarding = useAppStore((s) => s.completeOnboarding)
  const requestPermission = useAppStore((s) => s.requestPermission)
  const dataSource = useAppStore((s) => s.dataSource)
  const navigate = useNavigate()
  const onPermissions = step === STEPS.length

  const finish = async () => {
    await completeOnboarding()
    navigate('/smart-clean?autostart=1')
  }

  const content = onPermissions
    ? {
        title: 'onboarding.permission.title' as TKey,
        body: 'onboarding.permission.body' as TKey,
        art: <PermissionArt />,
      }
    : STEPS[step]

  return (
    <motion.div className="fixed inset-0 z-[60] flex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.35 } }}>
      <div className="relative w-[52%] overflow-hidden brand-gradient">
        <div data-tauri-drag-region className="absolute inset-x-0 top-0 z-10 h-12" />
        <div className="absolute inset-0 bg-[radial-gradient(600px_400px_at_80%_100%,rgba(62,240,200,0.35),transparent_60%),radial-gradient(500px_400px_at_10%_0%,rgba(255,255,255,0.25),transparent_60%)]" />
        <AnimatePresence mode="wait">
          <motion.div key={step} className="relative h-full" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.4 }}>
            {content.art}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="app-backdrop relative flex flex-1 flex-col justify-between px-14 pt-16 pb-12">
        <div data-tauri-drag-region className="absolute inset-x-0 top-0 h-12" />
        <div className="flex gap-1.5">
          {[...STEPS, null].map((_, i) => (
            <motion.span key={i} className="h-1.5 rounded-full" animate={{ width: i === step ? 28 : 8, background: i <= step ? '#6e5bff' : 'var(--color-surface-3)' }} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }}>
            <p className="mb-3 text-[12px] font-bold tracking-[0.12em] text-brand uppercase">{onPermissions ? t('onboarding.permissionsEyebrow') : t('onboarding.stepOf', { step: step + 1, total: STEPS.length })}</p>
            <h1 className="font-display text-[40px] leading-[1.08] font-bold tracking-[-0.035em] text-ink">{t(content.title)}</h1>
            <p className="mt-4 max-w-md text-[16px] leading-relaxed text-ink-2">{t(content.body)}</p>
            {onPermissions && (
              <ul className="mt-6 max-w-md space-y-2.5 text-[13px] text-ink-2">
                <li className="flex gap-2.5">
                  <ShieldCheck size={17} className="mt-[1px] shrink-0 text-mint" />
                  {t('onboarding.permission.local')}
                </li>
                <li className="flex gap-2.5">
                  <ShieldCheck size={17} className="mt-[1px] shrink-0 text-mint" />
                  {t('onboarding.permission.folders')}
                </li>
                <li className="flex gap-2.5">
                  <ShieldCheck size={17} className="mt-[1px] shrink-0 text-mint" />
                  {t('onboarding.permission.changeLater')}
                </li>
              </ul>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              <ArrowLeft size={15} className="rtl-flip" /> {t('common.back')}
            </Button>
          ) : (
            <span />
          )}
          {onPermissions ? (
            <div className="flex gap-2">
              {dataSource === 'tauri' && (
                <Button variant="secondary" size="lg" onClick={() => requestPermission('full-disk-access')}>
                  {t('common.openSystemSettings')}
                </Button>
              )}
              <Button variant="primary" size="lg" onClick={finish}>
                {t('common.continue')} <ArrowRight size={16} className="rtl-flip" />
              </Button>
            </div>
          ) : (
            <Button variant="primary" size="lg" onClick={() => setStep(step + 1)}>
              {step === STEPS.length - 1 ? t('onboarding.startCleaning') : t('common.continue')} <ArrowRight size={16} className="rtl-flip" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
