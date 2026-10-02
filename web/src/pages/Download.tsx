import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { AlertTriangle, Calendar, CheckCircle2, Cpu, Download as DownloadIcon, FolderInput, HardDrive, Info, MousePointerClick, RefreshCw, Rocket, ShieldCheck, Tag } from 'lucide-react'
import { APP, DOWNLOAD, architectureLabel } from '@/config/site'
import { DownloadButton } from '@/components/DownloadButton'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'

const INSTALL_STEPS: { icon: typeof DownloadIcon; title: string; body: ReactNode }[] = [
  { icon: DownloadIcon, title: 'Download the DMG', body: <>Click <b>Download for Mac</b>. The disk image is saved to your Downloads folder.</> },
  { icon: MousePointerClick, title: 'Open the DMG', body: <>Double-click <code>{DOWNLOAD.fileName}</code> in Downloads. A window opens showing the app and your Applications folder.</> },
  { icon: FolderInput, title: 'Drag to Applications', body: <>Drag <b>MacBook Cleaner</b> onto the Applications folder, then eject the disk image from Finder’s sidebar.</> },
  { icon: Rocket, title: 'Launch the app', body: <>Open MacBook Cleaner from Applications or Launchpad. Run it from Applications — scheduled cleanup only works from there.</> },
]

function useDownloadStarted(): boolean {
  // Read after mount: the page is prerendered without a query string.
  const [started, setStarted] = useState(false)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('started') === '1') setStarted(true)
  }, [])
  return started
}

export function DownloadPage() {
  const started = useDownloadStarted()
  return (
    <div className="page">
      <section className="page-hero page-hero--download">
        <div className="container">
          <Reveal className="download-hero">
            <img src="/app-icon-256.png" alt="MacBook Cleaner app icon" width={128} height={128} className="download-hero__icon" />
            <h1 className="display-1">MacBook Cleaner for macOS</h1>
            <p className="lead">Storage cleanup and performance monitoring for your Mac — processed locally.</p>
            {started && (
              <p className="download-started" role="status">
                <CheckCircle2 size={18} aria-hidden="true" />
                <span>
                  Your download has started — <b>{DOWNLOAD.fileName}</b>. When it finishes, follow the steps below.
                </span>
              </p>
            )}
            <div className="download-hero__cta">
              <DownloadButton />
            </div>
            <p className="download-hero__file">
              {DOWNLOAD.fileName}
              {DOWNLOAD.size && ` · ${DOWNLOAD.size}`} · Disk image (.dmg)
            </p>
            <ol className="quick-steps" aria-label="How to install">
              <li>Download MacBook Cleaner.</li>
              <li>Open the downloaded DMG.</li>
              <li>Drag MacBook Cleaner into Applications.</li>
              <li>Launch the app{APP.notarized ? '.' : <> — the first time, <a href="#open-anyway">use Open Anyway</a>.</>}</li>
            </ol>
            <ul className="spec-row" aria-label="Release details">
              <li>
                <Tag size={15} aria-hidden="true" /> Version {APP.version}
              </li>
              {(DOWNLOAD.releaseDate || DOWNLOAD.buildDate) && (
                <li>
                  <Calendar size={15} aria-hidden="true" /> {DOWNLOAD.releaseDate ? `Released ${DOWNLOAD.releaseDate}` : `Built ${DOWNLOAD.buildDate}`}
                </li>
              )}
              <li>
                <HardDrive size={15} aria-hidden="true" /> {APP.minMacOSName} or later
              </li>
              <li>
                <Cpu size={15} aria-hidden="true" /> {architectureLabel()}
              </li>
              {DOWNLOAD.size && (
                <li>
                  <DownloadIcon size={15} aria-hidden="true" /> {DOWNLOAD.size}
                </li>
              )}
            </ul>
            <p className="download-hero__links">
              <Link to="/changelog">Release notes</Link>
              <span aria-hidden="true">·</span>
              <Link to="/privacy">Privacy</Link>
              <span aria-hidden="true">·</span>
              <Link to="/terms">Terms</Link>
            </p>
            {DOWNLOAD.sha256 && (
              <p className="checksum">
                SHA-256: <code>{DOWNLOAD.sha256}</code>
              </p>
            )}
          </Reveal>
        </div>
      </section>

      <section className="section" aria-labelledby="req-title">
        <div className="container container--narrow">
          <SectionHeading eyebrow="System requirements" id="req-title" title="Will it run on my Mac?" />
          <Reveal className="req-grid">
            <div className="req">
              <HardDrive size={22} aria-hidden="true" />
              <h3>macOS</h3>
              <p>
                {APP.minMacOSName} ({APP.minMacOS}) or later
              </p>
            </div>
            <div className="req">
              <Cpu size={22} aria-hidden="true" />
              <h3>Processor</h3>
              <p>{architectureLabel()}</p>
              {!APP.architectures.includes('intel') && <small>Intel Macs aren’t supported by this build.</small>}
            </div>
            <div className="req">
              <ShieldCheck size={22} aria-hidden="true" />
              <h3>Account</h3>
              <p>None needed</p>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="install" className="section section--tint" aria-labelledby="install-title">
        <div className="container">
          <SectionHeading eyebrow="Installation" id="install-title" title="Install in under a minute." />
          <ol className="install-steps">
            {INSTALL_STEPS.map((s, i) => {
              const Icon = s.icon
              return (
                <Reveal as="li" key={s.title} className="install-step" delay={i * 80}>
                  <span className="install-step__num" aria-hidden="true">
                    {i + 1}
                  </span>
                  <Icon size={24} aria-hidden="true" className="install-step__icon" />
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </Reveal>
              )
            })}
          </ol>
        </div>
      </section>

      {!APP.notarized && (
        <section id="open-anyway" className="section" aria-labelledby="gatekeeper-title">
          <div className="container container--narrow">
            <SectionHeading eyebrow="First launch" id="gatekeeper-title" title="Seeing a security warning?" intro="That’s expected right now — here’s why, and how to open the app safely." />
            <Reveal className="notice">
              <AlertTriangle size={22} aria-hidden="true" />
              <div>
                <h3>MacBook Cleaner isn’t notarized by Apple yet</h3>
                <p>
                  Apps distributed outside the Mac App Store are normally signed with an Apple Developer ID and notarized. This version is signed ad hoc — without a Developer ID — and isn’t notarized, so the first time you open it, macOS Gatekeeper says it can’t verify
                  the developer or check the app for malicious software. This message doesn’t mean a problem was found — it means Apple hasn’t reviewed this build.
                </p>
                <p>
                  <b>Only download MacBook Cleaner from this website.</b> If you got the file anywhere else, delete it.
                </p>
              </div>
            </Reveal>

            <Reveal className="howto" delay={60}>
              <h3>Open it once via System Settings</h3>
              <ol>
                <li>Open MacBook Cleaner from Applications. When the warning appears, click <b>Done</b> (or <b>Cancel</b>) — don’t move it to the Trash.</li>
                <li>
                  Open <b>System Settings → Privacy &amp; Security</b> and scroll down to the <b>Security</b> section.
                </li>
                <li>
                  Next to the message about MacBook Cleaner being blocked, click <b>Open Anyway</b>, then confirm with your password or Touch ID.
                </li>
                <li>
                  Click <b>Open</b> in the final dialog. macOS remembers your choice, so you only need to do this once per version.
                </li>
              </ol>
              <p className="howto__tip">
                On macOS 14 Sonoma and earlier you can also Control-click the app in Applications, choose <b>Open</b>, then click <b>Open</b> again.
              </p>
            </Reveal>
          </div>
        </section>
      )}

      <section className="section section--tint" aria-labelledby="after-title">
        <div className="container">
          <SectionHeading eyebrow="After installing" id="after-title" title="Good to know." />
          <div className="extras-grid extras-grid--3">
            <Reveal className="extra">
              <ShieldCheck size={20} aria-hidden="true" />
              <h3>Permissions</h3>
              <p>
                macOS may ask to let the app access Downloads, Desktop and Documents, and to control Finder when you first clean. Full Disk Access is optional. <Link to="/faq#permissions">Why each one is needed →</Link>
              </p>
            </Reveal>
            <Reveal className="extra" delay={60}>
              <RefreshCw size={20} aria-hidden="true" />
              <h3>Updates</h3>
              <p>
                There’s no automatic updater. <b>Settings → Check for Updates</b> opens this page — download the new version and replace the app in Applications. Your settings are kept.
              </p>
            </Reveal>
            <Reveal className="extra" delay={120}>
              <Info size={20} aria-hidden="true" />
              <h3>Uninstalling</h3>
              <p>
                Turn off Scheduled Cleanup and Launch at Login, then drag the app to the Trash. <Link to="/faq#uninstall">Full steps →</Link>
              </p>
            </Reveal>
          </div>
          <p className="center-link">
            Stuck? <Link to="/support" className="text-link">Contact support →</Link>
          </p>
        </div>
      </section>
    </div>
  )
}
