import { Link } from 'react-router'
import { SITE } from '@/config/site'

export function Logo({ size = 30, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <Link to="/" className="brand" aria-label={`${SITE.name} home`}>
      <img src="/favicon.svg" alt="" width={size} height={size} />
      {withText && <span>{SITE.name}</span>}
    </Link>
  )
}
