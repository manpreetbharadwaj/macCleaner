import type { CSSProperties } from 'react'
import { Ban, Bell, Check, Code2, EyeOff, Gauge, MemoryStick, Monitor, Power, RotateCcw, ShieldCheck, ShieldOff, Trash2, X } from 'lucide-react'
import { CORE_FEATURES, FEATURE_DEEP_DIVES, MONITOR_DEEP_DIVES, type FeatureDeepDive } from '@/data/features'
import { AppPreview } from '@/components/AppPreview'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'
import { FinalCta } from '@/sections/FinalCta'
import { PrivacySection } from '@/sections/PrivacySection'
import { cx } from '@/utils/format'

const EXTRAS = [
  { icon: EyeOff, title: 'Scan exclusions', body: 'Add files or folders that should never be suggested — manually or on a schedule.' },
  { icon: ShieldCheck, title: 'Confirm before cleanup', body: 'On by default. Turn it off to skip the dialog for Safe-only cleanups; Review items and your own files always ask.' },
  { icon: Code2, title: 'Developer cleanup toggle', body: 'Hide Xcode, simulator and package-manager caches entirely if you don’t need them.' },
  { icon: Monitor, title: 'Light, dark or system', body: 'Follows your Mac’s appearance, or pick one.' },
  { icon: Power, title: 'Launch at Login', body: 'Optional and off by default.' },
  { icon: Bell, title: 'Native notifications', body: 'Scheduled-cleanup reminders and summaries, using macOS notifications.' },
  { icon: Trash2, title: 'Trash overview', body: 'See how much space the Trash is using and open it in Finder when you’re ready to empty it.' },
  { icon: RotateCcw, title: 'Reset all data', body: 'Clear settings, exclusions, schedule and history in one step. Never touches your files.' },
]

const NOT_DOING = [
  { icon: MemoryStick, text: 'No RAM “boosting” — Performance shows memory use, it doesn’t fiddle with it' },
  { icon: Gauge, text: 'No speed-up promises or startup-item tweaks' },
  { icon: ShieldOff, text: 'No antivirus or malware scanning' },
  { icon: Ban, text: 'No permanent deletion or file shredding' },
  { icon: X, text: 'No cleaning of system folders outside your home folder' },
]

function DeepDive({ f, reverse, hasDark = false, note = false }: { f: FeatureDeepDive; reverse: boolean; hasDark?: boolean; note?: boolean }) {
  const Icon = f.icon
  return (
    <section id={f.id} className="section deep-dive" aria-labelledby={`${f.id}-title`}>
      <div className={cx('container split', reverse && 'split--reverse')}>
        <Reveal className="deep-dive__copy" style={{ '--c': f.color } as CSSProperties}>
          <p className="eyebrow eyebrow--icon">
            <span className="icon-tile icon-tile--sm" aria-hidden="true">
              <Icon size={16} />
            </span>
            {f.eyebrow}
          </p>
          <h2 id={`${f.id}-title`} className="display-3">
            {f.title}
          </h2>
          <p className="body-lg">{f.body}</p>
          <ul className="checks">
            {f.points.map((p) => (
              <li key={p}>
                <Check size={18} aria-hidden="true" /> {p}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={80}>
          <AppPreview screen={f.screen} alt={f.alt} hasDark={hasDark} />
          {note && <p className="shot-note">Shown with sample data.</p>}
        </Reveal>
      </div>
    </section>
  )
}

export function FeaturesPage() {
  return (
    <div className="page">
      <section className="page-hero">
        <div className="container">
          <SectionHeading
            level={1}
            eyebrow="Features"
            title={
              <>
                Clean your Mac. <span className="grad-text">Understand it, too.</span>
              </>
            }
            intro="MacBook Cleaner combines a storage analyzer, large-file and duplicate finders, an app uninstaller and a cache cleaner with a Mac performance monitor — CPU, memory, running apps, battery health and Mac information — all processed locally on your Mac."
          />
          <nav className="chip-nav" aria-label="Jump to feature">
            {[...CORE_FEATURES, ...MONITOR_DEEP_DIVES.map((d) => ({ id: d.id, title: d.eyebrow, icon: d.icon, color: d.color }))].map((f) => {
              const Icon = f.icon
              return (
                <a key={f.id} href={`#${f.id}`} className="chip-nav__item" style={{ '--c': f.color } as CSSProperties}>
                  <Icon size={15} aria-hidden="true" /> {f.title}
                </a>
              )
            })}
          </nav>
        </div>
      </section>

      {FEATURE_DEEP_DIVES.map((f, i) => (
        <DeepDive key={f.id} f={f} reverse={i % 2 === 1} />
      ))}

      <section className="page-hero" aria-labelledby="monitor-heading">
        <div className="container">
          <SectionHeading
            eyebrow="Performance"
            id="monitor-heading"
            title={
              <>
                A Mac performance monitor <span className="grad-text">that speaks plain English.</span>
              </>
            }
            intro="Live CPU and memory, the apps using the most resources, battery health and everything important about your Mac — read locally from macOS, refreshed only while you’re looking."
          />
        </div>
      </section>
      {MONITOR_DEEP_DIVES.map((f, i) => (
        <DeepDive key={f.id} f={f} reverse={i % 2 === 1} hasDark={f.screen === 'performance'} note />
      ))}

      <section className="section section--tint" aria-labelledby="extras-title">
        <div className="container">
          <SectionHeading eyebrow="Also in the app" id="extras-title" title="Thoughtful details." />
          <div className="extras-grid">
            {EXTRAS.map((e, i) => {
              const Icon = e.icon
              return (
                <Reveal key={e.title} className="extra" delay={(i % 4) * 60}>
                  <Icon size={20} aria-hidden="true" />
                  <h3>{e.title}</h3>
                  <p>{e.body}</p>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="not-title">
        <div className="container container--narrow">
          <SectionHeading eyebrow="Straight talk" id="not-title" title="What MacBook Cleaner doesn’t do." intro="Plenty of “cleaner” apps promise everything. Here’s what this one deliberately leaves out." />
          <Reveal as="ul" className="not-list">
            {NOT_DOING.map((n) => {
              const Icon = n.icon
              return (
                <li key={n.text}>
                  <Icon size={18} aria-hidden="true" /> {n.text}
                </li>
              )
            })}
          </Reveal>
        </div>
      </section>

      <PrivacySection />
      <FinalCta title="Ready to see what’s taking up space?" />
    </div>
  )
}
