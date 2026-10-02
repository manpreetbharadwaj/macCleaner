import { CORE_FEATURES } from '@/data/features'
import { FeatureCard } from '@/components/FeatureCard'
import { SectionHeading } from '@/components/SectionHeading'

export function CoreFeatures() {
  return (
    <section className="section" aria-labelledby="features-title">
      <div className="container">
        <SectionHeading
          eyebrow="Cleaning tools"
          id="features-title"
          title="Eight cleaning tools. One calm interface."
          intro="Each tool shows what it found, why it’s there and what happens if you remove it — so you can clean with confidence instead of guesswork."
        />
        <div className="feature-grid">
          {CORE_FEATURES.map((f, i) => (
            <FeatureCard key={f.id} feature={f} delay={(i % 4) * 60} />
          ))}
        </div>
      </div>
    </section>
  )
}
