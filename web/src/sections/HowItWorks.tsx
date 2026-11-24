import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { HardDrive, ListChecks, ScanSearch, Trash2 } from 'lucide-react'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'

const ICONS = [ScanSearch, ListChecks, Trash2, HardDrive]
const COLORS = ['#5b6cff', '#8b5cf6', '#19c39a', '#13b5e0']

export function HowItWorks() {
  const { t } = useTranslation('home')
  const steps = t('howItWorks.steps', { returnObjects: true }) as { title: string; body: string }[]
  return (
    <section className="section section--tint" aria-labelledby="how-title">
      <div className="container">
        <SectionHeading eyebrow={t('howItWorks.eyebrow')} id="how-title" title={t('howItWorks.title')} />
        <ol className="steps">
          {steps.map((s, i) => {
            const Icon = ICONS[i]
            return (
              <Reveal as="li" key={s.title} className="step" delay={i * 90} style={{ '--c': COLORS[i] } as CSSProperties}>
                <span className="step__num" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="icon-tile icon-tile--lg" aria-hidden="true">
                  <Icon size={26} />
                </span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </Reveal>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
