import { useCallback, useEffect, useState } from 'react'
import type { CleanupItem } from '@/types'

/**
 * Per-page selection that prunes itself whenever the item list changes —
 * successfully cleaned items drop out, while items that failed to move stay
 * selected so the user can see and retry them.
 */
export function useSelection(items: CleanupItem[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    const ids = new Set(items.map((i) => i.id))
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => ids.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [items])

  const toggle = useCallback((id: string, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const clear = useCallback(() => setSelected(new Set()), [])

  return { selected, setSelected, toggle, clear }
}
