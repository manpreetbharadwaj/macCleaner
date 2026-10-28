/** The app mark — same artwork as the app icon (public/logo.png). */
export function Logo({ size = 32 }: { size?: number }) {
  return <img src="/logo.png" alt="" width={size} height={size} className="shrink-0 object-contain" style={{ width: size, height: size }} />
}
