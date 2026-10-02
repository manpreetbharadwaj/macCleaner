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
  const ready = useAppStore((s) => s.ready)
  const settings = useAppStore((s) => s.settings)
  const init = useAppStore((s) => s.init)
  const location = useLocation()
  const outlet = useOutlet()

  useThemeSync(settings?.theme)
  useNotificationRouteHandoff()

  useEffect(() => {
    void init()
  }, [init])

  // When following the Mac's language, pick up a change made in System Settings while the app was open.
  useEffect(() => {
    const onFocus = () => void useAppStore.getState().refreshSystemLanguage()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  return (
    <>
      <AnimatePresence>{!ready && <Splash />}</AnimatePresence>
      {ready && (
        <div className="app-backdrop flex h-screen w-full overflow-hidden text-ink">
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
      <AnimatePresence>{ready && settings && !settings.onboardingCompleted && <Onboarding key="onboarding" />}</AnimatePresence>
    </>
  )
}
