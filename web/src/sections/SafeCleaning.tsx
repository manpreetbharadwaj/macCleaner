import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Ban, EyeOff, FolderLock, Hand, ListChecks, ShieldCheck, Undo2 } from 'lucide-react'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'

const LEVEL_TONES = ['safe', 'review', 'protected'] as const
const PRINCIPLE_ICONS = [ListChecks, Undo2, Hand, FolderLock, EyeOff, Ban]

export function SafeCleaning() {
  const { t } = useTranslation('home')
  const principles = t('safeCleaning.principles', { returnObjects: true }) as { title: string; body: string }[]

  return (
    <section className="section" aria-labelledby="safe-title">
      <div className="container">
        <SectionHeading
          eyebrow={t('safeCleaning.eyebrow')}
          id="safe-title"
          title={
            <>
              {t('safeCleaning.title1')}
              <span className="grad-text">{t('safeCleaning.title2')}</span>
            </>
          }
          intro={t('safeCleaning.intro')}
        />

        <div className="levels">
          {LEVEL_TONES.map((tone, i) => (
            <Reveal key={tone} className={`level level--${tone}`} delay={i * 80}>
              <span className={`safety-pill safety-pill--${tone}`}>
                <ShieldCheck size={13} aria-hidden="true" /> {t(`safeCleaning.levels.${tone}.label`)}
              </span>
              <h3>{t(`safeCleaning.levels.${tone}.title`)}</h3>
              <p>{t(`safeCleaning.levels.${tone}.body`)}</p>
              <div className="level__row" aria-hidden="true">
                <span className="level__check" />
                <span className="level__name">{t(`safeCleaning.levels.${tone}.example`)}</span>
                <span className="level__size">{t(`safeCleaning.levels.${tone}.size`)}</span>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="principles">
          {principles.map((p, i) => {
            const Icon = PRINCIPLE_ICONS[i]
            return (
              <Reveal key={p.title} className="principle" delay={(i % 3) * 70} style={{ '--c': '#5b6cff' } as CSSProperties}>
                <span className="principle__icon" aria-hidden="true">
                  <Icon size={20} />
                </span>
                <div>
                  <h3>{p.title}</h3>
                  <p>{p.body}</p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
