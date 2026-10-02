import type { ProgressUpdate } from '@/services/storageServiceTypes'
import { tDynamic } from './index'

/**
 * Scan/cleanup progress arrives from the native side with a stable `phase`
 * key and an English label. The UI shows the translation for the phase,
 * falling back to the native label for any phase it doesn't know.
 */
export function progressLabel(update: ProgressUpdate): string {
  return tDynamic(`progress.${update.phase}`, { ...(update.params ?? {}), defaultValue: update.label })
}
