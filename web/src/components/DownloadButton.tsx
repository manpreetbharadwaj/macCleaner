import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { AlertCircle, Check, Loader2 } from 'lucide-react'
import { DOWNLOAD, isDownloadAvailable } from '@/config/site'
import { cx } from '@/utils/format'
import { MacGlyph } from './AppleGlyph'

interface DownloadButtonProps {
  size?: 'md' | 'lg'
  variant?: 'primary' | 'light'
  label?: string
  className?: string
}

type State = 'idle' | 'checking' | 'started' | 'error'

/** Smallest plausible installer — anything below this is an error page, not a DMG. */
const MIN_INSTALLER_BYTES = 1_000_000

/**
 * Same-origin installers are checked with a HEAD request first so a missing
 * file or an HTML error page never gets "downloaded". Cross-origin hosts
 * (e.g. GitHub Releases) don't allow that check from the browser, so those
 * links are followed directly.
 */
async function verifyInstaller(url: string): Promise<string | null> {
  const target = new URL(url, window.location.href)
  if (target.origin !== window.location.origin) return null
  const res = await fetch(target, { method: 'HEAD', cache: 'no-store' })
  if (!res.ok) return `HTTP ${res.status} for ${target.pathname}`
  const type = res.headers.get('content-type') ?? ''
  if (type.includes('text/html')) return `${target.pathname} returned an HTML page (content-type ${type}), not the installer`
  const length = Number(res.headers.get('content-length') ?? '0')
  if (length > 0 && length < MIN_INSTALLER_BYTES) return `${target.pathname} is only ${length} bytes`
  return null
}

function startDownload(url: string, fileName: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/**
 * Every "Download" call to action on the site. It's a real link to the DMG
 * (so it works without JavaScript too); with JavaScript it verifies the file,
 * starts the download, then shows the installation steps.
 */
export function DownloadButton({ size = 'lg', variant = 'primary', label = 'Download for Mac', className }: DownloadButtonProps) {
  const [state, setState] = useState<State>('idle')
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const reset = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(reset.current), [])

  const settle = (next: State, ms: number) => {
    setState(next)
    window.clearTimeout(reset.current)
    reset.current = window.setTimeout(() => setState('idle'), ms)
  }

  const onClick = async (e: MouseEvent<HTMLAnchorElement>) => {
    // Let modified clicks (open in new tab, etc.) behave like a normal link.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    if (state === 'checking') return
    if (!isDownloadAvailable) {
      console.error('[download] No installer URL configured. Build the app (npm run tauri:build) or set VITE_MAC_DOWNLOAD_URL, then rebuild the website.')
      settle('error', 6000)
      return
    }
    setState('checking')
    try {
      const problem = await verifyInstaller(DOWNLOAD.url)
      if (problem) {
        console.error(`[download] Installer check failed: ${problem}`)
        settle('error', 6000)
        return
      }
    } catch (err) {
      // Network hiccup during the check — try the download anyway rather than block the user.
      console.warn('[download] Could not verify the installer before downloading:', err)
    }
    startDownload(DOWNLOAD.url, DOWNLOAD.fileName)
    settle('started', 5000)
    if (pathname !== '/download') navigate('/download?started=1')
  }

  const icon =
    state === 'checking' ? <Loader2 size={18} className="spin" aria-hidden="true" /> : state === 'started' ? <Check size={18} aria-hidden="true" /> : state === 'error' ? <AlertCircle size={18} aria-hidden="true" /> : <MacGlyph />
  const text = state === 'checking' ? 'Starting…' : state === 'started' ? 'Download started' : label

  if (!isDownloadAvailable) {
    return (
      <span className={cx('download-cta', className)}>
        <span className={cx('btn', `btn--${variant}`, size === 'lg' && 'btn--lg', 'is-disabled')} aria-disabled="true">
          <AlertCircle size={18} aria-hidden="true" /> Download unavailable
        </span>
        <span className="download-cta__unavailable">The verified Mac installer has not been published yet.</span>
      </span>
    )
  }

  return (
    <span className={cx('download-cta', className)}>
      <a
        href={DOWNLOAD.url}
        download={DOWNLOAD.fileName}
        className={cx('btn', `btn--${variant}`, size === 'lg' && 'btn--lg', state !== 'idle' && `is-${state}`)}
        onClick={onClick}
        aria-describedby={state === 'error' ? 'download-error' : undefined}
      >
        {icon} {text}
      </a>
      <span role="status" aria-live="polite" className="sr-only">
        {state === 'started' ? `Downloading ${DOWNLOAD.fileName}` : ''}
      </span>
      {state === 'error' && (
        <span id="download-error" role="alert" className="download-cta__error">
          The download couldn’t start. Please try again in a moment, or contact support.
        </span>
      )}
    </span>
  )
}
