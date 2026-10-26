import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FolderOpen, LogOut, OctagonX, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useAppStore } from '@/store/useAppStore'
import { performanceService } from '../performanceService'
import { usePerformanceStore } from '../usePerformanceStore'
import type { ProcessDetails as Details } from '../types'
import { formatClock, formatDuration, formatMemory , notAvailable, stateLabel } from '../format'
import { InfoTip, ProcessIcon, StatusChip } from './primitives'
import { useTranslation } from 'react-i18next'
import { tDynamic } from '@/i18n'
import { formatPercentValue } from '@/i18n/format'
import { translateNativeMessage } from '@/i18n/nativeText'

function Stat({ label, value, tip }: { label: string; value: ReactNode; tip?: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-3">
      <p className="flex items-center gap-1 text-[11.5px] font-semibold text-ink-3">
        {label}
        {tip && <InfoTip label={label}>{tip}</InfoTip>}
      </p>
      <p className="mt-0.5 font-display text-[18px] font-bold tracking-[-0.02em] text-ink tabular">{value}</p>
    </div>
  )
}


/**
 * Side panel for one app/process. Quit and Force Quit both go through
 * usePerformanceStore.quitProcess, which re-verifies the process's identity
 * in Rust before acting (see src-tauri/src/perf/quit.rs) — this panel never
 * assumes the `pid` it last saw is still the same process.
 */
export function ProcessDetails({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const slide = i18n.dir() === 'rtl' ? -40 : 40
  const entry = usePerformanceStore((s) => (id ? (s.processes?.entries.find((e) => e.id === id) ?? null) : null))
  const sampledAt = usePerformanceStore((s) => s.processes?.sampledAtMs ?? 0)
  const quitProcess = usePerformanceStore((s) => s.quitProcess)
  const pending = usePerformanceStore((s) => (entry ? s.pendingQuits[entry.pid] : undefined))
  const revealInFinder = useAppStore((s) => s.revealInFinder)
  const pushToast = useAppStore((s) => s.pushToast)
  const [details, setDetails] = useState<Details | null>(null)
  const [lastName, setLastName] = useState('')
  const [confirmForceQuit, setConfirmForceQuit] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const pid = entry?.pid
  const canQuit = !!entry && !entry.isSelf && entry.kind !== 'system'

  const runQuit = async (force: boolean) => {
    if (!entry) return
    const name = entry.name
    setConfirmForceQuit(false)
    try {
      const result = await quitProcess(entry.pid, entry.startedAtMs, force)
      if (result.status === 'terminated') pushToast(t(force ? 'performance.details.forceQuitSucceeded' : 'performance.details.quitSucceeded', { name }), 'success')
      else if (result.status === 'still_running') pushToast(t('performance.details.quitStillRunning', { name }), 'default')
      else if (result.status === 'not_found') pushToast(t('performance.details.quitAlreadyGone', { name }), 'default')
      else pushToast(t('performance.details.quitPermissionDenied', { name }), 'warning')
    } catch (err) {
      const message = typeof err === 'string' ? err : err instanceof Error ? err.message : String(err)
      pushToast(translateNativeMessage(message), 'warning')
    }
  }

  useEffect(() => {
    if (!id) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [id, onClose])

  // Remember the name so the panel can still say what quit.
  if (entry && entry.name !== lastName) setLastName(entry.name)

  // Refresh thread count etc. alongside each process-list refresh.
  useEffect(() => {
    if (pid === undefined) return
    let cancelled = false
    performanceService
      .getProcessDetails(pid)
      .then((d) => !cancelled && setDetails(d))
      .catch(() => !cancelled && setDetails(null))
    return () => {
      cancelled = true
    }
  }, [pid, sampledAt])

  const state = entry ? stateLabel(entry) : null
  const now = sampledAt

  return (
    <AnimatePresence>
      {id && (
        <motion.div className="fixed inset-0 z-50 flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <div className="absolute inset-0 bg-[#0b0d1d]/25 backdrop-blur-[3px]" onClick={onClose} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={t('performance.details.title', { name: entry?.name ?? lastName })}
            className="glass relative flex h-full w-[400px] max-w-[92vw] flex-col border-s border-line shadow-[-30px_0_80px_-30px_rgba(10,12,40,0.45)]"
            initial={{ x: slide, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: slide, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          >
            <div className="flex items-start gap-4 border-b border-line p-6 pt-12">
              {entry ? <ProcessIcon name={entry.name} bundlePath={entry.bundlePath} size={52} /> : <span className="h-13 w-13 rounded-2xl bg-surface-3" />}
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-display text-[20px] font-bold tracking-[-0.02em] text-ink">{entry?.name ?? lastName}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {entry ? (
                    <>
                      <StatusChip tone="neutral">{entry.kind === 'app' ? t('performance.apps.kind.app') : entry.kind === 'background' ? t('performance.apps.kind.backgroundProcess') : t('performance.apps.kind.system')}</StatusChip>
                      {state && <StatusChip tone={state.tone}>{state.label}</StatusChip>}
                      {entry.isSelf && <StatusChip tone="info">{t('performance.apps.thisApp')}</StatusChip>}
                    </>
                  ) : (
                    <StatusChip tone="warn">{t('performance.details.quit')}</StatusChip>
                  )}
                </div>
              </div>
              <button ref={closeRef} onClick={onClose} aria-label={t('common.close')} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink">
                <X size={16} />
              </button>
            </div>

            {entry && (
              <div className="scroll-area flex-1 space-y-5 overflow-y-auto p-6">
                <div className="grid grid-cols-2 gap-2.5">
                  <Stat label={t('performance.cpu')} value={entry.cpuPercent === null ? '—' : formatPercentValue(entry.cpuPercent, 1)} tip={t('performance.details.cpuTip')} />
                  <Stat label={t('performance.memory')} value={entry.memoryBytes === null ? '—' : formatMemory(entry.memoryBytes)} tip={t('performance.details.memoryTip')} />
                  <Stat label={t('performance.details.runningFor')} value={entry.startedAtMs ? formatDuration(now - entry.startedAtMs) : '—'} />
                  <Stat label={t('performance.details.threads')} value={details?.threadCount ?? '—'} tip={t('performance.details.threadsTip')} />
                </div>

                <dl className="divide-y divide-line rounded-2xl border border-line text-[12.5px]">
                  {[
                    [t('performance.details.launched'), entry.startedAtMs ? formatClock(entry.startedAtMs) : notAvailable()],
                    [t('performance.details.state'), entry.status === 'unknown' ? notAvailable() : tDynamic(`performance.details.status.${entry.status}`)],
                    [t('performance.details.pid'), String(entry.pid)],
                    [t('performance.details.processes'), entry.processCount > 1 ? t('performance.details.withHelpers', { count: entry.processCount }) : '1'],
                    [t('performance.details.owner'), details ? (details.ownedByYou ? t('performance.details.you') : t('performance.details.systemOwner')) : '—'],
                    ...(details?.bundleVersion ? [[t('performance.details.version'), details.bundleVersion]] : []),
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
                      <dt className="text-ink-3">{k}</dt>
                      <dd className="selectable text-end font-semibold text-ink tabular">{v}</dd>
                    </div>
                  ))}
                </dl>

                {details?.executablePath && (
                  <div>
                    <p className="mb-1.5 text-[11.5px] font-semibold text-ink-3">{t('performance.details.executable')}</p>
                    <p className="selectable rounded-xl bg-surface-2 px-3 py-2 font-mono text-[11px] leading-relaxed break-all text-ink-2">{details.executablePath}</p>
                  </div>
                )}
                {entry.bundlePath && (
                  <Button variant="secondary" size="sm" onClick={() => revealInFinder(entry.bundlePath!)}>
                    <FolderOpen size={14} /> {t('common.showInFinder')}
                  </Button>
                )}

                {canQuit ? (
                  <div className="space-y-2 border-t border-line pt-4">
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" disabled={!!pending} onClick={() => void runQuit(false)}>
                        <LogOut size={14} /> {pending === 'quit' ? t('performance.details.quitting') : t('performance.details.quitAction')}
                      </Button>
                      <Button variant="danger" size="sm" disabled={!!pending} onClick={() => setConfirmForceQuit(true)}>
                        <OctagonX size={14} /> {pending === 'force' ? t('performance.details.quitting') : t('performance.details.forceQuitAction')}
                      </Button>
                    </div>
                    <p className="text-[11.5px] leading-relaxed text-ink-3">{t('performance.details.quitHint')}</p>
                  </div>
                ) : (
                  <p className="text-[11.5px] leading-relaxed text-ink-3">{entry.isSelf ? t('performance.details.quitUnavailableSelf') : t('performance.details.quitUnavailableSystem')}</p>
                )}
              </div>
            )}
          </motion.aside>

          <Modal open={confirmForceQuit} onClose={() => setConfirmForceQuit(false)} width={420}>
            <div className="p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-danger-soft text-danger">
                <OctagonX size={20} />
              </div>
              <h2 className="font-display text-[18px] font-bold tracking-[-0.02em] text-ink">{t('performance.details.forceQuitConfirmTitle', { name: entry?.name ?? lastName })}</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{t('performance.details.forceQuitConfirmBody')}</p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-line bg-surface-2/60 px-6 py-4">
              <Button variant="ghost" onClick={() => setConfirmForceQuit(false)}>
                {t('common.cancel')}
              </Button>
              <Button variant="danger" onClick={() => void runQuit(true)}>
                <OctagonX size={15} /> {t('performance.details.forceQuitAction')}
              </Button>
            </div>
          </Modal>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
