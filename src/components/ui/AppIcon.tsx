import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import type { ApplicationItem } from '@/types'

/** The app's real icon (extracted natively) or a colorful monogram fallback. */
export function AppIcon({ app, size = 40 }: { app: ApplicationItem; size?: number }) {
  const icon = useAppStore((s) => s.appIcons[app.path])
  const loadAppIcon = useAppStore((s) => s.loadAppIcon)

  useEffect(() => {
    void loadAppIcon(app)
  }, [app, loadAppIcon])

  if (icon) return <img src={icon} alt="" width={size} height={size} className="shrink-0 drop-shadow-[0_3px_6px_rgba(0,0,0,0.15)]" draggable={false} />

  return (
    <div
      className="flex shrink-0 items-center justify-center font-display font-bold text-white"
      style={{
        width: size * 0.86,
        height: size * 0.86,
        margin: size * 0.07,
        borderRadius: size * 0.24,
        fontSize: size * 0.4,
        background: `linear-gradient(140deg, ${app.accent}, color-mix(in srgb, ${app.accent} 55%, #6e5bff))`,
        boxShadow: `0 4px 12px -4px ${app.accent}`,
      }}
    >
      {app.initial}
    </div>
  )
}
