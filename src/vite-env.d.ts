/// <reference types="vite/client" />

declare const __APP_VERSION__: string

declare module 'virtual:locale-meta' {
  const metas: { code: string; englishName: string; nativeName: string; dir: 'ltr' | 'rtl'; order?: number }[]
  export default metas
}
