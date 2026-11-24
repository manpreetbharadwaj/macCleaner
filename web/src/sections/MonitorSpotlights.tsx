import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Zap } from 'lucide-react'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'

/** Illustrative values only — labeled as such on the page. App names and example figures are not translated. */
const APPS = [
  { name: 'Chrome', ram: '1.8 GB', cpu: 14, color: '#ff8a4c', time: '3h 24m' },
  { name: 'VS Code', ram: '860 MB', cpu: 7, color: '#13b5e0', time: '1h 18m' },
  { name: 'Slack', ram: '610 MB', cpu: 2.4, color: '#f0508a', time: '6h 6m' },
  { name: 'Spotify', ram: '420 MB', cpu: 1, color: '#19c39a', time: '5h 12m' },
]

export function RunningAppsSpotlight() {
  const { t } = useTranslation('home')
  const checks = t('runningApps.checks', { returnObjects: true }) as string[]
  return (
    <section className="section" aria-labelledby="apps-spot-title">
      <div className="container split">
        <div>
          <SectionHeading
            align="left"
            eyebrow={t('runningApps.eyebrow')}
            id="apps-spot-title"
            title={
              <>
                {t('runningApps.title1')}
                <span className="grad-text">{t('runningApps.title2')}</span>
              </>
            }
            intro={t('runningApps.intro')}
          />
          <Reveal as="ul" className="checks" delay={80}>
            {checks.map((c) => (
              <li key={c}>
                <Check size={18} aria-hidden="true" /> {c}
              </li>
            ))}
          </Reveal>
        </div>
        <Reveal delay={100}>
          <div className="mock-card" role="img" aria-label={t('runningApps.title2')}>
            <div className="mock-card__head" aria-hidden="true">
              <span>{t('runningApps.headers.app')}</span>
              <span>{t('runningApps.headers.cpu')}</span>
              <span>{t('runningApps.headers.memory')}</span>
              <span>{t('runningApps.headers.running')}</span>
            </div>
            {APPS.map((a, i) => (
              <div key={a.name} className="app-row" style={{ '--c': a.color, '--i': i } as CSSProperties} aria-hidden="true">
                <span className="app-row__name">
                  <span className="app-row__icon">{a.name[0]}</span>
                  {a.name}
                </span>
                <span className="app-row__cpu">
                  <i style={{ width: `${(a.cpu / 14) * 100}%` }} />
                  <b>{a.cpu}%</b>
                </span>
                <span className="app-row__ram">{a.ram}</span>
                <span className="app-row__time">{a.time}</span>
              </div>
            ))}
            <p className="mock-card__note">{t('runningApps.note')}</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export function BatterySpotlight() {
  const { t } = useTranslation('home')
  const checks = t('battery.checks', { returnObjects: true }) as string[]
  return (
    <section className="section section--tint" aria-labelledby="battery-title">
      <div className="container split split--reverse">
        <div>
          <SectionHeading align="left" eyebrow={t('battery.eyebrow')} id="battery-title" title={t('battery.title')} intro={t('battery.intro')} />
          <Reveal as="ul" className="checks" delay={80}>
            {checks.map((c) => (
              <li key={c}>
                <Check size={18} aria-hidden="true" /> {c}
              </li>
            ))}
          </Reveal>
          <Reveal as="p" className="fine-print" delay={120}>
            {t('battery.finePrint')}
          </Reveal>
        </div>
        <Reveal delay={100}>
          <div className="battery-card" role="img" aria-label={t('battery.title')}>
            <div className="battery-visual" aria-hidden="true">
              <div className="battery-visual__body">
                <div className="battery-visual__fill" />
                <Zap size={30} className="battery-visual__bolt" />
              </div>
              <div className="battery-visual__cap" />
            </div>
            <p className="battery-card__pct" aria-hidden="true">
              87%
            </p>
            <dl className="battery-card__stats" aria-hidden="true">
              <div>
                <dt>{t('battery.stats.cycleCount')}</dt>
                <dd>264</dd>
              </div>
              <div>
                <dt>{t('battery.stats.maxCapacity')}</dt>
                <dd>91%</dd>
              </div>
              <div>
                <dt>{t('battery.stats.condition')}</dt>
                <dd className="is-good">{t('battery.stats.conditionValue')}</dd>
              </div>
              <div>
                <dt>{t('battery.stats.power')}</dt>
                <dd>{t('battery.stats.powerValue')}</dd>
              </div>
            </dl>
            <p className="mock-card__note">{t('battery.note')}</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

const SPEC_VALUES = ['MacBook Pro (14-inch)', 'Apple M2 Pro', '16 GB', '512 GB', 'Tahoe 26.5 · Up to date', '2 days 7 hours']

export function MacInfoSpotlight() {
  const { t } = useTranslation('home')
  const specKeys = ['model', 'chip', 'memory', 'storage', 'macos', 'uptime']
  return (
    <section className="section" aria-labelledby="macinfo-title">
      <div className="container split">
        <div>
          <SectionHeading
            align="left"
            eyebrow={t('macInfo.eyebrow')}
            id="macinfo-title"
            title={
              <>
                {t('macInfo.title1')}
                <span className="grad-text">{t('macInfo.title2')}</span>
              </>
            }
            intro={t('macInfo.intro')}
          />
          <Reveal as="p" className="fine-print" delay={80}>
            {t('macInfo.finePrint')}
          </Reveal>
        </div>
        <Reveal delay={100}>
          <div className="spec-card" role="img" aria-label={t('macInfo.title2')}>
            <div className="spec-card__hero" aria-hidden="true">
              <p>{t('macInfo.card.thisMac')}</p>
              <h3>{t('macInfo.card.model')}</h3>
            </div>
            <dl aria-hidden="true">
              {specKeys.map((k, i) => (
                <div key={k}>
                  <dt>{t(`macInfo.specs.${k}`)}</dt>
                  <dd>{SPEC_VALUES[i]}</dd>
                </div>
              ))}
            </dl>
            <p className="mock-card__note">{t('macInfo.note')}</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
