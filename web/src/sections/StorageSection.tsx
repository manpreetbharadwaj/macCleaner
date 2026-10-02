import { Check } from 'lucide-react'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'
import { StorageVisualization } from '@/components/StorageVisualization'

export function StorageSection() {
  return (
    <section className="section" aria-labelledby="storage-title">
      <div className="container split">
        <div>
          <SectionHeading
            align="left"
            eyebrow="Storage insights"
            id="storage-title"
            title={
              <>
                See where your space <span className="grad-text">actually went.</span>
              </>
            }
            intro="MacBook Cleaner measures your real folders and shows them as one colorful storage ring — the same categories you see in the app."
          />
          <Reveal as="ul" className="checks" delay={80}>
            <li>
              <Check size={18} aria-hidden="true" /> Sizes in decimal gigabytes, the way macOS reports storage
            </li>
            <li>
              <Check size={18} aria-hidden="true" /> Space that can’t be attributed is labeled honestly as System Data
            </li>
            <li>
              <Check size={18} aria-hidden="true" /> Libraries like Photos are measured, never opened or picked apart
            </li>
          </Reveal>
        </div>
        <Reveal delay={100}>
          <StorageVisualization />
        </Reveal>
      </div>
    </section>
  )
}
