import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'
import { StorageVisualization } from '@/components/StorageVisualization'

export function StorageSection() {
  const { t } = useTranslation('home')
  const checks = t('storageSection.checks', { returnObjects: true }) as string[]
  return (
    <section className="section" aria-labelledby="storage-title">
      <div className="container split">
        <div>
          <SectionHeading
            align="left"
            eyebrow={t('storageSection.eyebrow')}
            id="storage-title"
            title={
              <>
                {t('storageSection.title1')}
                <span className="grad-text">{t('storageSection.title2')}</span>
              </>
            }
            intro={t('storageSection.intro')}
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
          <StorageVisualization />
        </Reveal>
      </div>
    </section>
  )
}
