import { useEffect, useState } from 'react'
import { SUPPORTED_CODES } from '@/i18n'
import { resolveLanguage } from '@/i18n/resolve'
import { getSystemLocales } from '@/i18n/system'

/** The language the Mac itself resolves to (what "System Default" means right now). */
export function useSystemLanguage(): string | null {
  const [code, setCode] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    void getSystemLocales().then((locales) => alive && setCode(resolveLanguage('system', locales, SUPPORTED_CODES)))
    return () => {
      alive = false
    }
  }, [])
  return code
}
