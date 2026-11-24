import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Globe, RotateCcw } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { ACTIVE_LOCALES, localeInfo } from '@/i18n/locales'
import { getSavedLocale } from '@/i18n/detect'
import { cx } from '@/utils/format'

/**
 * Header/mobile-nav language switcher. A button + listbox-style popup (not a
 * native <select>, so the native name of every language can be shown
 * regardless of the page's own current language) with full keyboard support:
 * Escape and outside-click close it, arrow keys move focus, Enter/Space
 * selects. Switching never reloads the page and keeps the visitor on the
 * same page they were viewing (see LocaleContext.switchLocale).
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { t } = useTranslation('common')
  const { locale, switchLocale, resetToAutomatic } = useLocale()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const current = localeInfo(locale)
  const hasSavedPreference = typeof window !== 'undefined' && !!getSavedLocale()

  useEffect(() => {
    if (!open) return
    const selectedIndex = ACTIVE_LOCALES.findIndex((l) => l.code === locale)
    itemRefs.current[selectedIndex >= 0 ? selectedIndex : 0]?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        rootRef.current?.querySelector<HTMLButtonElement>('[data-switcher-trigger]')?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const moveFocus = (fromIndex: number, delta: number) => {
    const count = itemRefs.current.length
    const next = (fromIndex + delta + count) % count
    itemRefs.current[next]?.focus()
  }

  const select = async (code: string) => {
    setOpen(false)
    await switchLocale(code)
  }

  return (
    <div className={cx('lang-switcher', className)} ref={rootRef}>
      <button
        type="button"
        data-switcher-trigger
        className="lang-switcher__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('languageSwitcher.current', { language: current.nativeName })}
        onClick={() => setOpen((v) => !v)}
      >
        <Globe size={18} aria-hidden="true" />
        <span className="lang-switcher__current">{current.nativeName}</span>
      </button>
      {open && (
        <ul className="lang-switcher__menu" role="listbox" aria-label={t('languageSwitcher.label')} tabIndex={-1}>
          {ACTIVE_LOCALES.map((info, i) => (
            <li key={info.code} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={info.code === locale}
                ref={(el) => {
                  itemRefs.current[i] = el
                }}
                className={cx('lang-switcher__item', info.code === locale && 'is-selected')}
                dir={info.dir}
                onClick={() => select(info.code)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    moveFocus(i, 1)
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    moveFocus(i, -1)
                  }
                }}
              >
                <span>{info.nativeName}</span>
                {info.code === locale && <Check size={15} aria-hidden="true" />}
              </button>
            </li>
          ))}
          <li role="presentation" className="lang-switcher__divider" aria-hidden="true" />
          <li role="presentation">
            <button
              type="button"
              className="lang-switcher__item lang-switcher__item--reset"
              disabled={!hasSavedPreference}
              onClick={async () => {
                setOpen(false)
                await resetToAutomatic()
              }}
            >
              <RotateCcw size={15} aria-hidden="true" />
              <span>
                {t('languageSwitcher.resetToAutomatic')}
                <small>{t('languageSwitcher.resetDescription')}</small>
              </span>
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
