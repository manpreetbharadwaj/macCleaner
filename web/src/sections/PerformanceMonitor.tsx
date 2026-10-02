import { MONITOR_FEATURES } from '@/data/features'
import { AppPreview } from '@/components/AppPreview'
import { FeatureCard } from '@/components/FeatureCard'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'

export function PerformanceMonitor() {
  return (
    <section className="section" aria-labelledby="monitor-title">
      <div className="container">
        <SectionHeading
          eyebrow="New · Performance"
          id="monitor-title"
          title={
            <>
              Mac Performance Monitor. <span className="grad-text">Built in.</span>
            </>
          }
          intro="MacBook Cleaner is more than a storage cleaner. The Performance tab shows how your Mac is doing right now — in plain language, without turning into a developer tool."
        />
        <Reveal className="monitor-shot">
          <AppPreview screen="performance" hasDark alt="MacBook Cleaner Performance dashboard showing CPU, memory, storage and battery gauges, a Mac Health summary and live charts" />
          <p className="shot-note">Shown with the app’s sample data. On your Mac, every value is read live from macOS.</p>
        </Reveal>
        <div className="feature-grid monitor-grid">
          {MONITOR_FEATURES.map((f, i) => (
            <FeatureCard key={f.id} feature={f} delay={(i % 4) * 60} linked={false} />
          ))}
        </div>
      </div>
    </section>
  )
}
