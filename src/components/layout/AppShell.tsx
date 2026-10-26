import { useEffect } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { Toasts } from '@/components/ui/Toasts'
import { Logo } from '@/components/ui/Logo'
import { Onboarding } from '@/components/onboarding/Onboarding'
import { useAppStore } from '@/store/useAppStore'
import { useThemeSync } from '@/hooks/useThemeSync'
import { useNotificationRouteHandoff } from '@/hooks/useNotificationRouteHandoff'
import { useLicenseStore } from '@/features/license/useLicenseStore'
import { isLocked } from '@/features/license/types'
import { Paywall } from '@/features/license/components/Paywall'

function Splash() {
  return (
    <motion.div
      key="splash"
      className="app-backdrop fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4"
      exit={{ opacity: 0, scale: 1.03 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
        <Logo size={76} />
      </motion.div>
      <p className="font-display text-[15px] font-semibold text-ink-2">MacBook Cleaner</p>
    </motion.div>
  )
}

export function AppShell() {
  const appReady = useAppStore((s) => s.ready)
  const settings = useAppStore((s) => s.settings)
  const dataSource = useAppStore((s) => s.dataSource)
  const init = useAppStore((s) => s.init)
  const licenseState = useLicenseStore((s) => s.state)
  const initLicense = useLicenseStore((s) => s.init)
  const location = useLocation()
  const outlet = useOutlet()

  // Gate on both: showing the main app before the license state has loaded
  // would let a locked-out window flash open for a frame.
  const ready = appReady && licenseState !== null
  const locked = !!licenseState && isLocked(licenseState.status)

  useThemeSync(settings?.theme)
  useNotificationRouteHandoff()

  useEffect(() => {
    void init()
    void initLicense()
  }, [init, initLicense])

  // When following the Mac's language, pick up a change made in System Settings while the app was open.
  useEffect(() => {
    const onFocus = () => void useAppStore.getState().refreshSystemLanguage()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  return (
    <>
      <AnimatePresence>{!ready && <Splash />}</AnimatePresence>
      {ready && locked && <Paywall />}
      {ready && !locked && (
        <div className="app-backdrop flex h-screen w-full overflow-hidden text-ink">
          {dataSource === 'mock' && (
            <div
              role="status"
              className="fixed top-3 left-1/2 z-[100] -translate-x-1/2 rounded-full border border-amber-300/70 bg-amber-100/95 px-4 py-1.5 text-[11px] font-bold tracking-[0.08em] text-amber-950 shadow-lg backdrop-blur dark:border-amber-500/40 dark:bg-amber-950/90 dark:text-amber-100"
              title="Browser preview only. Scans, cleanup, performance readings, permissions, and scheduling use sample data and do not touch this Mac."
            >
              DEMO · SAMPLE DATA · NO FILES ARE CHANGED
            </div>
          )}
          <Sidebar />
          <main className="scroll-area relative flex-1 overflow-x-hidden overflow-y-auto">
            <div data-tauri-drag-region className="sticky top-0 z-10 -mb-11 h-11 w-full" />
            <div className="mx-auto min-h-full max-w-[1180px] px-10 pt-11 pb-28">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  {outlet}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
          <Toasts />
        </div>
      )}
      <AnimatePresence>{ready && !locked && settings && !settings.onboardingCompleted && <Onboarding key="onboarding" />}</AnimatePresence>
    </>
  )
}
