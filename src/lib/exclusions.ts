/** Same rule as src-tauri/src/auto_clean.rs::is_excluded — an exclusion covers the path itself and everything inside it. */
export function isExcluded(path: string, exclusions: string[]): boolean {
  return exclusions.some((ex) => path === ex || path.startsWith(`${ex}/`))
}

/** "~/Projects" → "/Users/alex/Projects", so typed exclusions match real scanned paths. */
export function normalizeExclusions(exclusions: string[], home: string | null): string[] {
  const out = exclusions.map((ex) => {
    const trimmed = ex.trim().replace(/\/+$/, '')
    if (home && (trimmed === '~' || trimmed.startsWith('~/'))) return home + trimmed.slice(1)
    return trimmed
  })
  return Array.from(new Set(out.filter(Boolean)))
}
