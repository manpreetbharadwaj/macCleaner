import { cx } from '@/utils/format'

interface AppPreviewProps {
  /** Base name of a screenshot in /public/screens (real captures of the app). */
  screen: string
  alt: string
  /** Also has a dark-mode capture (`<screen>-dark.jpg`) to use when the visitor's system is dark. */
  hasDark?: boolean
  /** 'laptop' draws a MacBook around the screen; 'window' a single macOS window. */
  frame?: 'laptop' | 'window'
  /** Above-the-fold images load eagerly with high priority. */
  priority?: boolean
  className?: string
}

export function AppPreview({ screen, alt, hasDark = false, frame = 'window', priority = false, className }: AppPreviewProps) {
  const img = (
    <picture>
      {hasDark && <source media="(prefers-color-scheme: dark)" srcSet={`/screens/${screen}-dark-720.jpg 720w, /screens/${screen}-dark.jpg 1320w`} sizes="(max-width: 900px) 92vw, 640px" />}
      <img
        src={`/screens/${screen}.jpg`}
        srcSet={`/screens/${screen}-720.jpg 720w, /screens/${screen}.jpg 1320w`}
        sizes="(max-width: 900px) 92vw, 640px"
        alt={alt}
        width={1320}
        height={860}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        {...(priority ? { fetchPriority: 'high' as const } : {})}
      />
    </picture>
  )

  if (frame === 'laptop') {
    return (
      <div className={cx('laptop', className)}>
        <div className="laptop__lid">
          <div className="laptop__screen">{img}</div>
        </div>
        <div className="laptop__base" aria-hidden="true">
          <span />
        </div>
      </div>
    )
  }

  return (
    <div className={cx('window', className)}>
      <div className="window__bar" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      {img}
    </div>
  )
}
