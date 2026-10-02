import { AnimatePresence, motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { itemName } from '@/i18n/items'
import { formatBytes } from '@/lib/format'
import { isPersonalFile } from '@/lib/meta'
import type { CleanupItem } from '@/types'
import type { FlowItem } from './CleanupFlow'

export function toFlowItems(items: CleanupItem[]): FlowItem[] {
  return items.map((i) => ({ id: i.id, name: itemName(i), path: i.path, sizeBytes: i.sizeBytes, safety: i.safety, personal: isPersonalFile(i) }))
}

/** Floating bar that appears whenever something on the page is selected. */
export function SelectionBar({ count, bytes, onClear, onClean, label }: { count: number; bytes: number; onClear: () => void; onClean: () => void; label?: string }) {
  const { t } = useTranslation()
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          className="pointer-events-none fixed end-0 bottom-6 start-[248px] z-40 flex justify-center px-6"
        >
          <div className="glass pointer-events-auto flex w-full max-w-[560px] items-center gap-4 rounded-[20px] border border-line py-2.5 pe-2.5 ps-5 shadow-[var(--shadow-lift)]">
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-ink">
                {t('selectionBar.selected', { count })}
              </p>
              <p className="text-[12px] text-ink-3">{t('selectionBar.willMove', { size: formatBytes(bytes) })}</p>
            </div>
            <Button variant="ghost" size="md" onClick={onClear}>
              {t('common.clear')}
            </Button>
            <Button variant="primary" size="md" onClick={onClean}>
              <Trash2 size={15} />
              {label ?? t('common.moveToTrash')}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
