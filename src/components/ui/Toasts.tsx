import { AnimatePresence, motion } from 'framer-motion'
import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store/useAppStore'

const ICONS = { default: Info, success: CircleCheck, warning: TriangleAlert }
const COLORS = { default: 'text-brand', success: 'text-mint', warning: 'text-sun' }

export function Toasts() {
  const { t: tr } = useTranslation()
  const toasts = useAppStore((s) => s.toasts)
  const dismiss = useAppStore((s) => s.dismissToast)
  return (
    <div className="pointer-events-none fixed end-6 bottom-6 z-[70] flex w-[360px] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = ICONS[t.tone]
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className="glass pointer-events-auto flex items-start gap-2.5 rounded-2xl border border-line px-3.5 py-3 shadow-[var(--shadow-lift)]"
            >
              <Icon size={17} className={`mt-[1px] shrink-0 ${COLORS[t.tone]}`} />
              <p className="flex-1 text-[13px] leading-snug text-ink">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="text-ink-3 hover:text-ink" aria-label={tr('common.dismiss')}>
                <X size={14} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
