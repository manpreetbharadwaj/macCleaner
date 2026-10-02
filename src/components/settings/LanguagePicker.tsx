import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Languages, Monitor, Search } from 'lucide-react'
import { clsx } from 'clsx'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/components/ui/Modal'
import { IconTile } from '@/components/ui/IconTile'
import { useAppStore } from '@/store/useAppStore'
import { LANGUAGES, formattingLocale, languageInfo } from '@/i18n'
import { useSystemLanguage } from '@/i18n/useSystemLanguage'

interface Option {
  code: string
  name: string
  detail: string
  lang?: string
  dir?: 'ltr' | 'rtl'
}

export function LanguagePicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const preference = useAppStore((s) => s.settings?.language ?? 'system')
  const updateSettings = useAppStore((s) => s.updateSettings)
  const systemCode = useSystemLanguage()
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(() => searchRef.current?.focus(), 80)
    return () => window.clearTimeout(id)
  }, [open])

  // Each language's name in the *current* UI language ("Französisch" when the app is German).
  const displayNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([formattingLocale(i18n.language)], { type: 'language' })
    } catch {
      return null
    }
  }, [i18n.language])

  const options = useMemo<Option[]>(() => {
    const system: Option = {
      code: 'system',
      name: t('language.system'),
      detail: systemCode ? t('language.systemDetail', { language: languageInfo(systemCode).nativeName }) : t('language.systemDetailPending'),
    }
    const langs = LANGUAGES.map((l) => ({
      code: l.code,
      name: l.nativeName,
      detail: displayNames?.of(l.code) ?? l.englishName,
      lang: l.code,
      dir: l.dir,
    }))
    const q = query.trim().toLocaleLowerCase()
    const all = [system, ...langs]
    if (!q) return all
    return all.filter((o) => [o.name, o.detail, o.code, o.code === 'system' ? '' : languageInfo(o.code).englishName].some((s) => s.toLocaleLowerCase().includes(q)))
  }, [t, systemCode, displayNames, query])

  // The search starts empty every time the picker opens.
  const close = () => {
    onClose()
    setQuery('')
  }

  const choose = (code: string) => {
    if (code !== preference) void updateSettings({ language: code })
    window.setTimeout(close, 220)
  }

  return (
    <Modal open={open} onClose={close} width={460}>
      <div className="flex max-h-[78vh] flex-col">
        <div className="flex items-center gap-3 border-b border-line p-6 pe-14">
          <IconTile icon={Languages} color="#5b6cff" size="md" solid />
          <div>
            <h2 className="font-display text-[19px] font-bold text-ink">{t('language.title')}</h2>
            <p className="text-[12.5px] text-ink-3">{t('language.subtitle')}</p>
          </div>
        </div>
        <div className="border-b border-line p-3">
          <div className="flex h-9.5 items-center gap-2 rounded-xl bg-surface-2 px-3">
            <Search size={15} className="text-ink-3" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('language.search')}
              aria-label={t('language.search')}
              className="selectable flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3"
            />
          </div>
        </div>
        <div role="listbox" aria-label={t('language.title')} className="scroll-area flex-1 overflow-y-auto p-2">
          {options.length === 0 && <p className="p-6 text-center text-[13px] text-ink-3">{t('common.noMatches')}</p>}
          {options.map((o) => {
            const active = o.code === preference
            return (
              <button
                key={o.code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => choose(o.code)}
                className={clsx('relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors', !active && 'hover:bg-surface-2')}
              >
                {active && <motion.span layoutId="language-active" className="absolute inset-0 rounded-xl bg-brand-soft" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-surface-3 text-[12px] font-bold text-ink-2">
                  {o.code === 'system' ? <Monitor size={15} /> : o.code.slice(0, 2).toUpperCase()}
                </span>
                <span className="relative min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-ink">
                    <bdi lang={o.lang} dir={o.dir}>
                      {o.name}
                    </bdi>
                  </span>
                  <span className="block truncate text-[11.5px] text-ink-3">{o.detail}</span>
                </span>
                {active && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="relative flex h-5 w-5 items-center justify-center rounded-full brand-gradient text-white">
                    <Check size={12} strokeWidth={3} />
                  </motion.span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
