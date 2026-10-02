import { motion } from 'framer-motion'
import { Eye, FolderSearch, EyeOff } from 'lucide-react'
import { clsx } from 'clsx'
import { Checkbox } from '@/components/ui/Checkbox'
import { IconButton } from '@/components/ui/Button'
import { IconTile } from '@/components/ui/IconTile'
import { SafetyPill } from '@/components/ui/SafetyPill'
import { useAppStore } from '@/store/useAppStore'
import { FILE_TYPE_META, fileTypeOf } from '@/lib/meta'
import { formatBytes, parentFolder } from '@/lib/format'
import type { CleanupItem } from '@/types'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { itemLastUsed, itemName } from '@/i18n/items'

interface FileRowProps {
  item: CleanupItem
  checked: boolean
  onToggle: (checked: boolean) => void
  /** Prevents selection — e.g. the last remaining copy in a duplicate group. */
  lockReason?: string
  icon?: LucideIcon
  color?: string
  showSafety?: boolean
  showExclude?: boolean
  /** Extra line under the path (e.g. "Newest copy"). */
  note?: string
  index?: number
}

export function FileRow({ item, checked, onToggle, lockReason, icon, color, showSafety = true, showExclude, note, index = 0 }: FileRowProps) {
  const { t } = useTranslation()
  const name = itemName(item)
  const revealInFinder = useAppStore((s) => s.revealInFinder)
  const quickLook = useAppStore((s) => s.quickLook)
  const excludeItem = useAppStore((s) => s.excludeItem)
  const type = FILE_TYPE_META[fileTypeOf(item)]
  const isFile = !!item.extension
  const disabled = item.safety === 'red' || !!lockReason

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index, 12) * 0.025 }}
      onClick={() => !disabled && onToggle(!checked)}
      className={clsx(
        'group flex items-center gap-3.5 rounded-2xl px-3 py-2.5 transition-colors',
        checked ? 'bg-brand-soft/70' : 'hover:bg-surface-2',
        disabled && 'opacity-70',
      )}
    >
      <Checkbox checked={checked} disabled={disabled} onChange={onToggle} label={t('common.selectItem', { name })} />
      <IconTile icon={icon ?? type.icon} color={color ?? type.color} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="selectable truncate text-[13.5px] font-semibold text-ink" title={name}>
            {name}
          </p>
          {showSafety && item.safety !== 'green' && <SafetyPill level={item.safety} />}
        </div>
        <p className="selectable truncate text-[12px] text-ink-3" title={item.path}>
          {parentFolder(item.path)}
          {note && <span className="ms-1.5 font-medium text-brand">· {note}</span>}
          {lockReason && <span className="ms-1.5 font-medium text-mint">· {lockReason}</span>}
        </p>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
        {isFile && (
          <IconButton label={t('common.quickLook')} onClick={() => quickLook(item.path)}>
            <Eye size={15} />
          </IconButton>
        )}
        <IconButton label={t('common.revealInFinder')} onClick={() => revealInFinder(item.path)}>
          <FolderSearch size={15} />
        </IconButton>
        {showExclude && (
          <IconButton label={t('common.neverSuggest')} onClick={() => excludeItem(item.id)}>
            <EyeOff size={15} />
          </IconButton>
        )}
      </div>
      <div className="w-24 shrink-0 text-end text-[12px] text-ink-3">{itemLastUsed(item)}</div>
      <div className="w-20 shrink-0 text-end text-[13.5px] font-semibold text-ink tabular">{formatBytes(item.sizeBytes)}</div>
    </motion.div>
  )
}
