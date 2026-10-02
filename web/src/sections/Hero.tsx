import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Cpu, HardDrive, Lock, ShieldCheck, Tag, Undo2 } from 'lucide-react'
import { APP, DOWNLOAD, architectureLabel } from '@/config/site'
import { AppPreview } from '@/components/AppPreview'
import { DownloadButton } from '@/components/DownloadButton'

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="container hero__grid">
        <div className="hero__copy">
          <p className="pill hero__pill rise" style={{ '--d': '0ms' } as CSSProperties}>
            <span className="pill__dot" aria-hidden="true" /> Version {APP.version} · Made for macOS
          </p>
          <h1 id="hero-title" className="hero__title rise" style={{ '--d': '60ms' } as CSSProperties}>
            Clean. Monitor.
            <br />
            <span className="grad-text">Understand your Mac.</span>
          </h1>
          <p className="hero__lead rise" style={{ '--d': '120ms' } as CSSProperties}>
            Free up storage, understand memory usage, monitor running apps, check battery health and see important information about your Mac — from one simple dashboard. You review everything. Nothing is permanently deleted.
          </p>
          <div className="hero__ctas rise" style={{ '--d': '180ms' } as CSSProperties}>
            <DownloadButton />
            <Link to="/features" className="btn btn--ghost btn--lg">
              Explore Features <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <ul className="hero__meta rise" style={{ '--d': '240ms' } as CSSProperties} aria-label="Requirements">
            <li>
              <HardDrive size={15} aria-hidden="true" /> {APP.minMacOSName} or later
            </li>
            <li>
              <Cpu size={15} aria-hidden="true" /> {architectureLabel()}
            </li>
            <li>
              <Tag size={15} aria-hidden="true" /> v{APP.version}
              {DOWNLOAD.size && ` · ${DOWNLOAD.size}`}
            </li>
          </ul>
        </div>

        <div className="hero__visual rise" style={{ '--d': '160ms' } as CSSProperties}>
          <AppPreview screen="dashboard" hasDark frame="laptop" priority alt="MacBook Cleaner dashboard with a colorful storage ring, Smart Clean summary and quick tiles for large files, old downloads, duplicates and app leftovers" />
          <div className="float-chip float-chip--a" aria-hidden="true">
            <span className="float-chip__icon" style={{ '--c': '#19c39a' } as CSSProperties}>
              <Undo2 size={16} />
            </span>
            <span>
              <b>Moved to Trash</b>
              <small>Always recoverable</small>
            </span>
          </div>
          <div className="float-chip float-chip--b" aria-hidden="true">
            <span className="float-chip__icon" style={{ '--c': '#8b5cf6' } as CSSProperties}>
              <Lock size={16} />
            </span>
            <span>
              <b>Personal files</b>
              <small>Never preselected</small>
            </span>
          </div>
          <div className="float-chip float-chip--c" aria-hidden="true">
            <span className="float-chip__icon" style={{ '--c': '#13b5e0' } as CSSProperties}>
              <ShieldCheck size={16} />
            </span>
            <span>
              <b>Scans on your Mac</b>
              <small>Nothing uploaded</small>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
