import { SITE } from '@/config/site'
import { Link } from './router'

// `/logo.png` is a full-bleed square with no built-in padding or rounding
// (the native macOS app icon is a separately composited asset — see
// scripts/compose-macos-icon.swift — deliberately not reused here, since
// a website nav mark doesn't need the same Dock-grid padding). A
// proportional corner radius, at the same ratio Apple's own icon grid
// uses (186/824 ≈ 22.6%), keeps it visually consistent with the app icon
// without literally being the same asset.
const CORNER_RADIUS_RATIO = 186 / 824

export function Logo({ size = 30, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <Link to="/" className="brand" aria-label={`${SITE.name} home`}>
      <img
        src="/logo.png"
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: size * CORNER_RADIUS_RATIO, objectFit: 'cover', display: 'block' }}
      />
      {withText && <span>{SITE.name}</span>}
    </Link>
  )
}
