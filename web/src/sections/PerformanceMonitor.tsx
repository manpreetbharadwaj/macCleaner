import { useTranslation } from 'react-i18next'
import { useMonitorFeatures } from '@/data/features'
import { AppPreview } from '@/components/AppPreview'
import { FeatureCard } from '@/components/FeatureCard'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'

export function PerformanceMonitor() {
  const { t } = useTranslation('home')
  const features = useMonitorFeatures()
  return (
    <section className="section" aria-labelledby="monitor-title">
      <div className="container">
        <SectionHeading
          eyebrow={t('performanceMonitor.eyebrow')}
          id="monitor-title"
          title={
            <>
              {t('performanceMonitor.title1')}
              <span className="grad-text">{t('performanceMonitor.title2')}</span>
            </>
          }
          intro={t('performanceMonitor.intro')}
        />
        <Reveal className="monitor-shot">
          <AppPreview screen="performance" hasDark alt={t('performanceMonitor.shotAlt')} />
          <p className="shot-note">{t('performanceMonitor.shotNote')}</p>
        </Reveal>
        <div className="feature-grid monitor-grid">
          {features.map((f, i) => (
            <FeatureCard key={f.id} feature={f} delay={(i % 4) * 60} linked={false} />
          ))}
        </div>
      </div>
    </section>
  )
}
