/// <reference types="vite/client" />

declare const __APP_VERSION__: string
declare const __APP_MIN_MACOS__: string
declare const __APP_BUNDLE_ID__: string

interface ImportMetaEnv {
  readonly VITE_SITE_URL?: string
  readonly VITE_MAC_DOWNLOAD_URL?: string
  readonly VITE_RELEASE_DATE?: string
  readonly VITE_SUPPORT_EMAIL?: string
  readonly VITE_PRIVACY_EMAIL?: string
}
