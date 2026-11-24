import { useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'
import { cx } from '@/utils/format'

const SHOT_IDS = ['dashboard', 'scanning', 'results', 'performance', 'performance-apps', 'performance-battery', 'complete', 'storage', 'dashboard-dark']

/** Accessible tabs (WAI-ARIA tabs pattern) over real screenshots of the app. */
export function ScreenGallery() {
  const { t } = useTranslation('home')
  const [active, setActive] = useState(0)
  const tabs = useRef<Array<HTMLButtonElement | null>>([])

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    let next = active
    if (e.key === 'ArrowRight') next = (active + 1) % SHOT_IDS.length
    else if (e.key === 'ArrowLeft') next = (active - 1 + SHOT_IDS.length) % SHOT_IDS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = SHOT_IDS.length - 1
    else return
    e.preventDefault()
    setActive(next)
    tabs.current[next]?.focus()
  }

  const shotId = SHOT_IDS[active]
  return (
    <section className="section" aria-labelledby="gallery-title">
      <div className="container">
        <SectionHeading eyebrow={t('gallery.eyebrow')} id="gallery-title" title={t('gallery.title')} intro={t('gallery.intro')} />
        <Reveal>
          <div className="tabs" role="tablist" aria-label={t('gallery.title')} onKeyDown={onKey}>
            {SHOT_IDS.map((id, i) => (
              <button
                key={id}
                ref={(el) => {
                  tabs.current[i] = el
                }}
                type="button"
                role="tab"
                id={`tab-${id}`}
                aria-selected={i === active}
                aria-controls="gallery-panel"
                tabIndex={i === active ? 0 : -1}
                className={cx('tab', i === active && 'is-active')}
                onClick={() => setActive(i)}
              >
                {t(`gallery.shots.${id}.label`)}
              </button>
            ))}
          </div>
          <div id="gallery-panel" role="tabpanel" aria-labelledby={`tab-${shotId}`} className="gallery-frame">
            <div className="window">
              <div className="window__bar" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <img
                key={shotId}
                className="fade-in"
                src={`/screens/${shotId}.jpg`}
                srcSet={`/screens/${shotId}-720.jpg 720w, /screens/${shotId}.jpg 1320w`}
                sizes="(max-width: 1100px) 94vw, 1040px"
                alt={t(`gallery.shots.${shotId}.alt`)}
                width={1320}
                height={860}
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
