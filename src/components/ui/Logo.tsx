/** The app mark — same artwork as the app icon (src-tauri/icons/source/icon.svg), simplified for small sizes. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="100 100 824 824" className="shrink-0 drop-shadow-[0_4px_10px_rgba(91,108,255,0.35)]">
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4F8BFF" />
          <stop offset="0.55" stopColor="#6E5BFF" />
          <stop offset="1" stopColor="#A24DF5" />
        </linearGradient>
        <linearGradient id="logo-spark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7DF9E0" />
          <stop offset="1" stopColor="#3CC8FF" />
        </linearGradient>
      </defs>
      <rect x="100" y="100" width="824" height="824" rx="186" fill="url(#logo-bg)" />
      <rect x="270" y="318" width="484" height="318" rx="36" fill="#fff" />
      <rect x="300" y="348" width="424" height="258" rx="16" fill="#2a2f7a" />
      <path d="M214 652 H810 a14 14 0 0 1 14 14 v6 a34 34 0 0 1 -34 34 H234 a34 34 0 0 1 -34 -34 v-6 a14 14 0 0 1 14 -14 Z" fill="#fff" />
      <path d="M512 388 Q524 465 600 477 Q524 489 512 566 Q500 489 424 477 Q500 465 512 388 Z" fill="url(#logo-spark)" />
      <path d="M772 214 Q779 254 819 261 Q779 268 772 308 Q765 268 725 261 Q765 254 772 214 Z" fill="#fff" />
    </svg>
  )
}
