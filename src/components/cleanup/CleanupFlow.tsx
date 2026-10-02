import { useCallback, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, FolderHeart, Loader2, ShieldCheck, Trash2, TriangleAlert, Undo2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { SafetyPill } from '@/components/ui/SafetyPill'
import { AnimatedBytes } from '@/components/ui/AnimatedNumber'
import { useAppStore, type CleanupOutcome } from '@/store/useAppStore'
import { formatBytes, parentFolder } from '@/lib/format'
import type { SafetyLevel } from '@/types'
import type { CleanupProgressUpdate } from '@/services/storageServiceTypes'
import { Trans, useTranslation } from 'react-i18next'
import { i18n } from '@/i18n'
import { progressLabel } from '@/i18n/progress'
import { translateNativeMessage } from '@/i18n/nativeText'

export interface FlowItem {
  id: string
  name: string
  path: string
  sizeBytes: number
  safety: SafetyLevel
  /** The user's own file (Downloads, Documents, Desktop, Movies) or app data with settings — always needs explicit confirmation. */
  personal?: boolean
}

interface StartOptions {
  items: FlowItem[]
  run: (onProgress: (u: CleanupProgressUpdate) => void) => Promise<CleanupOutcome>
  /** Overrides the default "Cleanup Complete" headline (e.g. "Uninstalled Slack"). */
  doneTitle?: string
  onDone?: (outcome: CleanupOutcome) => void
}

type Stage = 'idle' | 'confirm' | 'cleaning' | 'done'

/**
 * The single path every removal in the app goes through:
 * confirm (with explicit acknowledgement for anything personal or
 * review-level) → progress → celebration with honest results.
 */
export function useCleanupFlow() {
  const settings = useAppStore((s) => s.settings)
  const [stage, setStage] = useState<Stage>('idle')
  const [opts, setOpts] = useState<StartOptions | null>(null)
  const [progress, setProgress] = useState<CleanupProgressUpdate | null>(null)
  const [outcome, setOutcome] = useState<CleanupOutcome | null>(null)

  const execute = useCallback(async (o: StartOptions) => {
    setStage('cleaning')
    setProgress({ phase: 'preparing', label: 'Preparing cleanup…' })
    try {
      const result = await o.run(setProgress)
      setOutcome(result)
      o.onDone?.(result)
    } catch (err) {
      setOutcome({ movedBytes: 0, successCount: 0, failures: [{ path: '', name: i18n.t('cleanup.failureName'), reason: err instanceof Error ? err.message : String(err) }] })
    }
    setStage('done')
  }, [])

  const start = useCallback(
    (o: StartOptions) => {
      const removable = o.items.filter((i) => i.safety !== 'red')
      if (removable.length === 0) return
      const next = { ...o, items: removable }
      setOpts(next)
      setOutcome(null)
      const needsReview = removable.some((i) => i.safety !== 'green' || i.personal)
      // "Confirm before cleanup" can only ever skip the dialog for all-Safe,
      // non-personal selections — never for anything that needs review.
      if (settings && !settings.confirmBeforeCleanup && !needsReview) void execute(next)
      else setStage('confirm')
    },
    [settings, execute],
  )

  const close = useCallback(() => setStage('idle'), [])

  const element = (
    <>
      <ConfirmDialog open={stage === 'confirm'} items={opts?.items ?? []} onCancel={close} onConfirm={() => opts && execute(opts)} />
      <CleaningOverlay open={stage === 'cleaning'} progress={progress} />
      <CompletionOverlay open={stage === 'done'} outcome={outcome} title={opts?.doneTitle} onClose={close} />
    </>
  )

  return { start, element, busy: stage === 'cleaning' }
}

function ConfirmDialog({ open, items, onCancel, onConfirm }: { open: boolean; items: FlowItem[]; onCancel: () => void; onConfirm: () => void }) {
  const { t } = useTranslation()
  const [reviewing, setReviewing] = useState(false)
  const [ack, setAck] = useState(false)
  const total = items.reduce((s, i) => s + i.sizeBytes, 0)
  const personal = items.filter((i) => i.personal)
  const review = items.filter((i) => i.safety === 'orange' && !i.personal)
  const needsAck = personal.length > 0 || review.length > 0
  const sorted = useMemo(() => [...items].sort((a, b) => b.sizeBytes - a.sizeBytes), [items])

  // Reset local state whenever the dialog re-opens.
  const [lastOpen, setLastOpen] = useState(open)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) {
      setReviewing(false)
      setAck(false)
    }
  }

  return (
    <Modal open={open} onClose={onCancel} width={540}>
      <div className="p-7 pb-6">
        <div className="mb-5 flex h-13 w-13 items-center justify-center rounded-2xl brand-gradient text-white shadow-[var(--shadow-glow)]">
          <Trash2 size={24} />
        </div>
        <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-ink">
          <Trans i18nKey="cleanup.aboutToRemove" values={{ size: formatBytes(total) }} components={{ b: <span className="brand-text" /> }} />
        </h2>
        <p className="mt-1.5 text-[13.5px] text-ink-2">
          {t('cleanup.willMove', { count: items.length })}
        </p>

        <div className="mt-5 space-y-2">
          <div className="flex items-center gap-2.5 rounded-xl bg-mint-soft px-3.5 py-2.5 text-[12.5px] text-ink">
            <Undo2 size={15} className="shrink-0 text-mint" />
            {t('cleanup.notPermanent')}
          </div>
          {personal.length > 0 && (
            <div className="flex items-center gap-2.5 rounded-xl bg-sun-soft px-3.5 py-2.5 text-[12.5px] text-ink">
              <FolderHeart size={15} className="shrink-0 text-sun" />
              {t('cleanup.personalWarning', { count: personal.length })}
            </div>
          )}
          {review.length > 0 && (
            <div className="flex items-center gap-2.5 rounded-xl bg-sun-soft px-3.5 py-2.5 text-[12.5px] text-ink">
              <TriangleAlert size={15} className="shrink-0 text-sun" />
              {t('cleanup.reviewWarning', { count: review.length })}
            </div>
          )}
        </div>

        <button
          onClick={() => setReviewing((v) => !v)}
          className="mt-4 flex w-full items-center justify-between rounded-xl px-1 text-[12.5px] font-semibold text-brand"
        >
          {reviewing ? t('cleanup.hideList') : t('cleanup.reviewFilesLink')}
          <ChevronDown size={15} className={`transition-transform ${reviewing ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence initial={false}>
          {reviewing && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="scroll-area mt-2 max-h-56 space-y-0.5 overflow-y-auto rounded-xl bg-surface-2 p-2"
            >
              {sorted.map((item) => (
                <li key={item.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px]">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{item.name}</p>
                    <p className="selectable truncate text-[11px] text-ink-3">{parentFolder(item.path)}</p>
                  </div>
                  {(item.safety !== 'green' || item.personal) && <SafetyPill level="orange" />}
                  <span className="w-16 text-end font-semibold text-ink tabular">{formatBytes(item.sizeBytes)}</span>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>

        {needsAck && (
          <label className="mt-4 flex cursor-default items-start gap-3 rounded-xl border border-line-strong p-3.5 text-[12.5px] text-ink" onClick={() => setAck(!ack)}>
            <Checkbox checked={ack} onChange={setAck} />
            <span>{t('cleanup.ack')}</span>
          </label>
        )}
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-line bg-surface-2/60 px-7 py-4">
        <Button variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        {!reviewing && (
          <Button variant="secondary" onClick={() => setReviewing(true)}>
            {t('cleanup.reviewFiles')}
          </Button>
        )}
        <Button variant="primary" disabled={needsAck && !ack} onClick={onConfirm}>
          <Trash2 size={15} />
          {t('cleanup.cleanNow')}
        </Button>
      </div>
    </Modal>
  )
}

function CleaningOverlay({ open, progress }: { open: boolean; progress: CleanupProgressUpdate | null }) {
  const { t } = useTranslation()
  return (
    <Modal open={open} onClose={() => {}} locked width={420}>
      <div className="flex flex-col items-center px-8 py-10 text-center">
        <div className="relative mb-6 h-28 w-28">
          <div className="animate-pulse-ring absolute inset-0 rounded-full brand-gradient opacity-40" />
          <div className="absolute inset-0 flex items-center justify-center rounded-full brand-gradient text-white shadow-[var(--shadow-glow)]">
            <Loader2 size={40} className="animate-spin" strokeWidth={2.2} />
          </div>
        </div>
        <h3 className="font-display text-[19px] font-semibold text-ink">{t('cleanup.cleaning')}</h3>
        <p className="mt-1.5 line-clamp-2 min-h-[2.6em] max-w-xs text-[12.5px] text-ink-3">{progress ? progressLabel(progress) : t('cleanup.preparing')}</p>
      </div>
    </Modal>
  )
}

const CONFETTI_COLORS = ['#5b6cff', '#8b5cf6', '#19c39a', '#13b5e0', '#ff8a4c', '#f0508a', '#f5b400']

/** Deterministic pseudo-random in [0, 1) — keeps the confetti burst pure and identical every time. */
function rand(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

const CONFETTI = Array.from({ length: 46 }, (_, i) => ({
  id: i,
  x: (rand(i + 1) - 0.5) * 520,
  y: -rand(i + 101) * 260 - 60,
  r: rand(i + 201) * 540 - 270,
  d: 0.9 + rand(i + 301) * 0.8,
  c: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  w: 6 + rand(i + 401) * 6,
  round: rand(i + 501) > 0.6,
}))

function Confetti() {
  const pieces = CONFETTI
  return (
    <div className="pointer-events-none absolute top-24 left-1/2" dir="ltr">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute block"
          style={{ width: p.w, height: p.round ? p.w : p.w * 0.45, background: p.c, borderRadius: p.round ? 99 : 2 }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 420], opacity: [1, 1, 0], rotate: p.r }}
          transition={{ duration: p.d + 1, ease: [0.2, 0.7, 0.4, 1], times: [0, 0.35, 1] }}
        />
      ))}
    </div>
  )
}

function CompletionOverlay({ open, outcome, title, onClose }: { open: boolean; outcome: CleanupOutcome | null; title?: string; onClose: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const openTrash = useAppStore((s) => s.openTrash)
  const dataSource = useAppStore((s) => s.dataSource)
  const failures = outcome?.failures ?? []
  const nothing = outcome !== null && outcome.successCount === 0

  return (
    <Modal open={open} onClose={onClose} width={500}>
      <div className="relative flex flex-col items-center overflow-hidden px-8 pt-10 pb-7 text-center">
        {open && !nothing && <Confetti />}
        <motion.div
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.05 }}
          className={`relative mb-5 flex h-24 w-24 items-center justify-center rounded-full text-white ${nothing ? 'bg-sun' : 'bg-gradient-to-br from-[#12c79b] to-[#13b5e0] shadow-[0_18px_40px_-12px_rgba(19,181,160,0.8)]'}`}
        >
          {nothing ? (
            <TriangleAlert size={40} />
          ) : (
            <svg viewBox="0 0 24 24" className="h-11 w-11" fill="none">
              <motion.path
                d="M5 12.5 9.7 17 19 7.5"
                stroke="white"
                strokeWidth={2.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.35, ease: 'easeOut' }}
              />
            </svg>
          )}
        </motion.div>

        <h2 className="font-display text-[24px] font-bold tracking-[-0.02em] text-ink">{nothing ? t('cleanup.nothingRemoved') : title ?? t('cleanup.complete')}</h2>
        {!nothing && outcome && (
          <>
            <p className="mt-3 text-[13px] font-medium tracking-wide text-ink-3 uppercase">{t('cleanup.youFreed')}</p>
            <AnimatedBytes bytes={outcome.movedBytes} className="font-display text-[54px] leading-none font-bold tracking-[-0.03em] mint-text" duration={1.4} />
            <p className="mt-3 text-[14px] text-ink-2">{t('cleanup.breathingRoom')}</p>
          </>
        )}

        {!nothing && (
          <div className="mt-5 flex w-full items-start gap-2.5 rounded-xl bg-surface-2 p-3 text-start text-[12px] text-ink-2">
            <ShieldCheck size={15} className="mt-[1px] shrink-0 text-mint" />
            <span>
              {t('cleanup.recoverable')}{' '}
              {dataSource === 'tauri' && (
                <button className="font-semibold text-brand hover:underline" onClick={() => openTrash()}>
                  {t('cleanup.openTrash')}
                </button>
              )}
            </span>
          </div>
        )}

        {failures.length > 0 && (
          <div className="mt-3 w-full rounded-xl bg-sun-soft p-3 text-start">
            <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-sun">
              <TriangleAlert size={13} />
              {t('cleanup.failedCount', { count: failures.length })}
            </p>
            <ul className="scroll-area max-h-28 space-y-0.5 overflow-y-auto">
              {failures.map((f, i) => (
                <li key={`${f.path}-${i}`} className="text-[11.5px] text-ink-2">
                  <span className="font-medium text-ink">{f.name}</span> — {translateNativeMessage(f.reason)}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 grid w-full grid-cols-2 gap-2.5">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              onClose()
              navigate('/storage')
            }}
          >
            {t('cleanup.viewStorage')}
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              onClose()
              navigate('/dashboard')
            }}
          >
            {t('cleanup.backToDashboard')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
