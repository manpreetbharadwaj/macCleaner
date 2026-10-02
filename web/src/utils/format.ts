export function formatGb(gb: number, digits = 1): string {
  return `${gb.toFixed(digits)} GB`
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
