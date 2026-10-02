import type { CSSProperties, ElementType, ReactNode } from 'react'
import { useInView } from '@/hooks/useInView'
import { cx } from '@/utils/format'

interface RevealProps {
  children: ReactNode
  as?: ElementType
  className?: string
  delay?: number
  style?: CSSProperties
  id?: string
}

/** Fades/slides content in once it scrolls into view. Visible by default without JS and with reduced motion. */
export function Reveal({ children, as: Tag = 'div', className, delay = 0, style, id }: RevealProps) {
  const { ref, inView } = useInView<HTMLElement>()
  return (
    <Tag ref={ref} id={id} className={cx('reveal', inView && 'is-in', className)} style={{ ...style, '--reveal-delay': `${delay}ms` } as CSSProperties}>
      {children}
    </Tag>
  )
}
