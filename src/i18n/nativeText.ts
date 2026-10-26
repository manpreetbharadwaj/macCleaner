import { i18n, tDynamic, type TKey } from './index'

/**
 * Text that originates in the Rust layer (fixed English strings — see
 * src-tauri/src/trash.rs, app_footprint.rs, login_item.rs, schedule.rs,
 * external_url.rs, state.rs)
 * mapped onto translation keys. Matching is exact or by stable prefix; any
 * message we don't recognise is shown with a translated lead-in plus the
 * original detail, so nothing is ever silently dropped.
 */

const FOOTPRINT_LABELS: Record<string, TKey> = {
  Cache: 'apps.footprint.cache',
  'Network cache': 'apps.footprint.networkCache',
  Logs: 'apps.footprint.logs',
  'Saved window state': 'apps.footprint.savedState',
  'Website data': 'apps.footprint.websiteData',
  'Supporting files': 'apps.footprint.support',
  Preferences: 'apps.footprint.preferences',
  'Sandbox container': 'apps.footprint.container',
}

export function footprintLabel(label: string): string {
  const key = FOOTPRINT_LABELS[label]
  return key ? (i18n.t(key) as string) : label
}

// [pattern, key, captured param names]
const ERRORS: Array<[RegExp, TKey, string[]?]> = [
  [/^Empty path$/, 'errors.native.invalidPath'],
  [/^Path must be absolute$/, 'errors.native.invalidPath'],
  [/^File no longer exists( at this path)?$/, 'errors.native.gone'],
  [/^Refusing to trash a protected system location: (.+)$/, 'errors.native.protectedSystem', ['path']],
  [/^Refusing to trash the home directory itself$/, 'errors.native.homeFolder'],
  [/^Refusing to trash a protected folder: (.+)$/, 'errors.native.protectedFolder', ['path']],
  [/^Refusing to trash a path outside the user's home directory$/, 'errors.native.outsideHome'],
  [/^This item's path suggests it may contain sensitive data/, 'errors.native.sensitive'],
  [/^Could not access \(permission denied or already gone\)/, 'errors.native.noAccess'],
  [/^Refusing to trash a root folder$/, 'errors.native.rootFolder'],
  [/^Could not resolve path/, 'errors.native.gone'],
  [/^macOS reported an error \(code (-?\d+)\): (.*)$/, 'errors.native.macos', ['code', 'detail']],
  [/^Could not move to Trash/, 'errors.native.trashFailed'],
  [/^Protected items cannot be cleaned$/, 'errors.native.protectedItem'],
  [/^Not an application bundle$/, 'errors.native.notApp'],
  [/^Only \.app bundles can be uninstalled$/, 'errors.native.notApp'],
  [/^Only apps directly inside an Applications folder can be uninstalled$/, 'errors.native.notInApplications'],
  [/^macOS system apps cannot be uninstalled$/, 'errors.native.systemApp'],
  [/^Apple apps are part of macOS and are protected$/, 'errors.native.systemApp'],
  [/^MacBook Cleaner cannot uninstall itself$/, 'errors.native.self'],
  [/^Preview is only available for files in your home folder$/, 'errors.native.previewHomeOnly'],
  [/^Launch at login is only available in the installed app/, 'errors.native.loginDevBuild'],
  [/^MacBook Cleaner is running from a disk image or your Downloads folder/, 'errors.native.notInstalled'],
  [/^Could not determine home directory$/, 'errors.native.noHome'],
  [/^launchctl bootstrap failed/, 'errors.native.scheduleFailed'],
  [/^This app is no longer at that location$/, 'errors.native.appMoved'],
  [/^Invalid application path$/, 'errors.native.notApp'],
  [/^Could not move the app to Trash/, 'errors.native.trashFailed'],
  [/^(Not a valid URL|Only https links can be opened|Links containing credentials|Links with a custom port|The link has no host|.+ is not an allowed destination)/, 'errors.native.linkBlocked'],
  [/^(Could not open your default browser|macOS could not open the link)/, 'errors.native.browserFailed'],
  [/^Could not determine (LaunchAgents|Application Support) directory$/, 'errors.native.noAppSupport'],
  [/^Invalid time_of_day/, 'errors.native.invalidTime'],
  [/^MacBook Cleaner cannot quit itself$/, 'errors.native.selfQuit'],
  [/^This process is protected by macOS and cannot be quit$/, 'errors.native.protectedProcess'],
  [/^Only your own processes can be quit$/, 'errors.native.notOwnProcess'],
  [/^macOS refused to quit this application$/, 'errors.native.quitRefused'],
  [/^Enter a license key first\.$/, 'errors.native.licenseKeyRequired'],
  [/^This license key isn't active\./, 'errors.native.licenseNotActive'],
  [/^This license key wasn't found\./, 'errors.native.licenseNotFound'],
  [/^This license key is already activated on another Mac\./, 'errors.native.licenseLimitReached'],
  [/^Couldn't reach Dodo Payments:/, 'errors.native.licenseNetworkError'],
  [/^Dodo /, 'errors.native.licenseServerError'],
  [/^Unknown error$/, 'errors.generic'],
]

/** A Rust error/failure message in the current language. */
export function translateNativeMessage(message: string): string {
  const text = message.trim()
  for (const [pattern, key, names] of ERRORS) {
    const m = pattern.exec(text)
    if (m) {
      const params = Object.fromEntries((names ?? []).map((n, i) => [n, m[i + 1]]))
      return tDynamic(key, params)
    }
  }
  return i18n.t('errors.native.unknown', { detail: text }) as string
}
