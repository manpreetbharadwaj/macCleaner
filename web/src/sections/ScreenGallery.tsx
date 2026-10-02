import { useRef, useState, type KeyboardEvent } from 'react'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'
import { cx } from '@/utils/format'

const SHOTS = [
  { id: 'dashboard', label: 'Dashboard', alt: 'Dashboard with storage ring and Smart Clean summary' },
  { id: 'scanning', label: 'Scanning', alt: 'Smart Clean scan in progress' },
  { id: 'results', label: 'Smart Clean', alt: 'Smart Clean results grouped by category' },
  { id: 'performance', label: 'Performance', alt: 'Performance dashboard with live CPU and memory' },
  { id: 'performance-apps', label: 'Running Apps', alt: 'Running apps sorted by memory' },
  { id: 'performance-battery', label: 'Battery', alt: 'Battery health with cycle count and maximum capacity' },
  { id: 'complete', label: 'Cleanup complete', alt: 'Cleanup complete summary showing space moved to the Trash' },
  { id: 'storage', label: 'Storage', alt: 'Storage breakdown by category' },
  { id: 'dashboard-dark', label: 'Dark mode', alt: 'Dashboard in dark mode' },
]

/** Accessible tabs (WAI-ARIA tabs pattern) over real screenshots of the app. */
export function ScreenGallery() {
  const [active, setActive] = useState(0)
  const tabs = useRef<Array<HTMLButtonElement | null>>([])

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    let next = active
    if (e.key === 'ArrowRight') next = (active + 1) % SHOTS.length
    else if (e.key === 'ArrowLeft') next = (active - 1 + SHOTS.length) % SHOTS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = SHOTS.length - 1
    else return
    e.preventDefault()
    setActive(next)
    tabs.current[next]?.focus()
  }

  const shot = SHOTS[active]
  return (
    <section className="section" aria-labelledby="gallery-title">
      <div className="container">
        <SectionHeading eyebrow="Screenshots" id="gallery-title" title="Designed to feel at home on your Mac." intro="Real screens from the app, shown with its built-in sample data. Light and dark appearance follow your system." />
        <Reveal>
          <div className="tabs" role="tablist" aria-label="App screens" onKeyDown={onKey}>
            {SHOTS.map((s, i) => (
              <button
                key={s.id}
                ref={(el) => {
                  tabs.current[i] = el
                }}
                type="button"
                role="tab"
                id={`tab-${s.id}`}
                aria-selected={i === active}
                aria-controls="gallery-panel"
                tabIndex={i === active ? 0 : -1}
                className={cx('tab', i === active && 'is-active')}
                onClick={() => setActive(i)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div id="gallery-panel" role="tabpanel" aria-labelledby={`tab-${shot.id}`} className="gallery-frame">
            <div className="window">
              <div className="window__bar" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <img key={shot.id} className="fade-in" src={`/screens/${shot.id}.jpg`} srcSet={`/screens/${shot.id}-720.jpg 720w, /screens/${shot.id}.jpg 1320w`} sizes="(max-width: 1100px) 94vw, 1040px" alt={shot.alt} width={1320} height={860} loading="lazy" decoding="async" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
