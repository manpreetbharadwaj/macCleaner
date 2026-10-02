import type { ReactNode } from 'react'
import { Reveal } from './Reveal'
import { cx } from '@/utils/format'

interface SectionHeadingProps {
  eyebrow?: string
  title: ReactNode
  intro?: ReactNode
  align?: 'center' | 'left'
  /** Heading level — h1 for page headers, h2 for sections. */
  level?: 1 | 2
  id?: string
}

export function SectionHeading({ eyebrow, title, intro, align = 'center', level = 2, id }: SectionHeadingProps) {
  const H = level === 1 ? 'h1' : 'h2'
  return (
    <Reveal className={cx('section-heading', align === 'left' && 'is-left')}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <H id={id} className={level === 1 ? 'display-1' : 'display-2'}>
        {title}
      </H>
      {intro && <p className="lead">{intro}</p>}
    </Reveal>
  )
}
