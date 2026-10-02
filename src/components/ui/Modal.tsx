import { useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { clsx } from 'clsx'
import { useTranslation } from 'react-i18next'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  width?: number
  /** Hide the close button and ignore Escape/backdrop clicks (e.g. while cleaning). */
  locked?: boolean
  className?: string
}

export function Modal({ open, onClose, children, width = 520, locked, className }: ModalProps) {
  const { t } = useTranslation()
  useEffect(() => {
    if (!open || locked) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, locked, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-[#0b0d1d]/35 backdrop-blur-[6px]" onClick={() => !locked && onClose()} />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={clsx('card relative max-h-[86vh] w-full overflow-hidden !rounded-[26px] !shadow-[0_30px_80px_-20px_rgba(10,12,40,0.45)]', className)}
            style={{ maxWidth: width }}
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            {!locked && (
              <button
                onClick={onClose}
                aria-label={t('common.close')}
                className="absolute top-4 end-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink"
              >
                <X size={16} />
              </button>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
