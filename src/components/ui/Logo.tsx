/**
 * The app mark — same artwork as the app icon (public/logo.png).
 *
 * `public/logo.png` is a full-bleed square with no built-in padding or
 * rounding (unlike the native macOS `.icns`, which is composited onto
 * Apple's icon grid at build time — see scripts/compose-macos-icon.swift).
 * UI contexts don't need that same padding (there's no OS-level Dock/
 * Finder tile to match the weight of), but a hard square corner still
 * reads wrong next to this app's otherwise-rounded design language — so
 * this applies a proportional corner radius instead, at the same ratio
 * Apple's own icon grid uses (186/824 ≈ 22.6% of the content size), so it
 * scales consistently whether it's a 30px sidebar mark or a 168px
 * onboarding mark.
 */
const CORNER_RADIUS_RATIO = 186 / 824

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <img
      src="/logo.png"
      alt=""
      width={size}
      height={size}
      className="shrink-0 object-cover"
      style={{ width: size, height: size, borderRadius: size * CORNER_RADIUS_RATIO }}
    />
  )
}
