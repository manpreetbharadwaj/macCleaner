import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Ban, Bell, Check, Code2, EyeOff, Gauge, MemoryStick, Monitor, Power, RotateCcw, ShieldCheck, ShieldOff, Trash2, X } from 'lucide-react'
import { useCoreFeatures, useFeatureDeepDives, useMonitorDeepDives, type FeatureDeepDive } from '@/data/features'
import { AppPreview } from '@/components/AppPreview'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'
import { FinalCta } from '@/sections/FinalCta'
import { PrivacySection } from '@/sections/PrivacySection'
import { cx } from '@/utils/format'

const EXTRA_ICONS = [EyeOff, ShieldCheck, Code2, Monitor, Power, Bell, Trash2, RotateCcw]
const NOT_DOING_ICONS = [MemoryStick, Gauge, ShieldOff, Ban, X]

function DeepDive({ f, reverse, hasDark = false, note = false }: { f: FeatureDeepDive; reverse: boolean; hasDark?: boolean; note?: boolean }) {
  const { t } = useTranslation('features')
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
          {note && <p className="shot-note">{t('page.sampleDataNote')}</p>}
        </Reveal>
      </div>
    </section>
  )
}

export function FeaturesPage() {
  const { t } = useTranslation('features')
  const coreFeatures = useCoreFeatures()
  const deepDives = useFeatureDeepDives()
  const monitorDeepDives = useMonitorDeepDives()
  const extras = t('page.extras', { returnObjects: true }) as { title: string; body: string }[]
  const notDoing = t('page.notDoing', { returnObjects: true }) as string[]
  const jumpTargets = [
    ...coreFeatures.map((f) => ({ id: f.id, title: f.title, icon: f.icon, color: f.color })),
    ...monitorDeepDives.map((d) => ({ id: d.id, title: d.eyebrow, icon: d.icon, color: d.color })),
  ]

  return (
    <div className="page">
      <section className="page-hero">
        <div className="container">
          <SectionHeading
            level={1}
            eyebrow={t('page.eyebrow')}
            title={
              <>
                {t('page.title1')}
                <span className="grad-text">{t('page.title2')}</span>
              </>
            }
            intro={t('page.intro')}
          />
          <nav className="chip-nav" aria-label={t('page.jumpToFeature')}>
            {jumpTargets.map((f) => {
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

      {deepDives.map((f, i) => (
        <DeepDive key={f.id} f={f} reverse={i % 2 === 1} />
      ))}

      <section className="page-hero" aria-labelledby="monitor-heading">
        <div className="container">
          <SectionHeading
            eyebrow={t('page.monitorEyebrow')}
            id="monitor-heading"
            title={
              <>
                {t('page.monitorTitle1')}
                <span className="grad-text">{t('page.monitorTitle2')}</span>
              </>
            }
            intro={t('page.monitorIntro')}
          />
        </div>
      </section>
      {monitorDeepDives.map((f, i) => (
        <DeepDive key={f.id} f={f} reverse={i % 2 === 1} hasDark={f.screen === 'performance'} note />
      ))}

      <section className="section section--tint" aria-labelledby="extras-title">
        <div className="container">
          <SectionHeading eyebrow={t('page.extrasEyebrow')} id="extras-title" title={t('page.extrasTitle')} />
          <div className="extras-grid">
            {extras.map((e, i) => {
              const Icon = EXTRA_ICONS[i]
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
          <SectionHeading eyebrow={t('page.notDoingEyebrow')} id="not-title" title={t('page.notDoingTitle')} intro={t('page.notDoingIntro')} />
          <Reveal as="ul" className="not-list">
            {notDoing.map((n, i) => {
              const Icon = NOT_DOING_ICONS[i]
              return (
                <li key={n}>
                  <Icon size={18} aria-hidden="true" /> {n}
                </li>
              )
            })}
          </Reveal>
        </div>
      </section>

      <PrivacySection />
      <FinalCta title={t('page.ctaTitle')} />
    </div>
  )
}
