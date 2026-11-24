import { useTranslation } from 'react-i18next'
import { useCoreFeatures } from '@/data/features'
import { FeatureCard } from '@/components/FeatureCard'
import { SectionHeading } from '@/components/SectionHeading'

export function CoreFeatures() {
  const { t } = useTranslation('home')
  const features = useCoreFeatures()
  return (
    <section className="section" aria-labelledby="features-title">
      <div className="container">
        <SectionHeading eyebrow={t('coreFeatures.eyebrow')} id="features-title" title={t('coreFeatures.title')} intro={t('coreFeatures.intro')} />
        <div className="feature-grid">
          {features.map((f, i) => (
            <FeatureCard key={f.id} feature={f} delay={(i % 4) * 60} />
          ))}
        </div>
      </div>
    </section>
  )
}
