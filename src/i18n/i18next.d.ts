import 'i18next'
import type en from './locales/en.json'

// Type-checks every t('…') key against the English file, so a typo or a
// missing key is a compile error rather than raw key text in the UI.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: Omit<typeof en, 'meta'> }
    returnNull: false
  }
}
