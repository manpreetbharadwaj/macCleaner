import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import type { Feature } from '@/data/features'
import { Reveal } from './Reveal'

export function FeatureCard({ feature, delay = 0, linked = true }: { feature: Feature; delay?: number; linked?: boolean }) {
  const Icon = feature.icon
  const body = (
    <>
      <span className="icon-tile" aria-hidden="true">
        <Icon size={22} strokeWidth={2} />
      </span>
      <h3>{feature.title}</h3>
      <p>{feature.summary}</p>
      {linked && (
        <span className="feature-card__more">
          Learn more <ArrowRight size={15} aria-hidden="true" />
        </span>
      )}
    </>
  )
  return (
    <Reveal delay={delay} className="feature-card" style={{ '--c': feature.color } as CSSProperties}>
      {linked ? (
        <Link to={`/features#${feature.id}`} className="feature-card__link">
          {body}
        </Link>
      ) : (
        <div className="feature-card__link">{body}</div>
      )}
    </Reveal>
  )
}
