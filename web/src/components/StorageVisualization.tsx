import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { DEMO_CATEGORIES, DEMO_FREE_GB, DEMO_RECLAIMABLE_GB, DEMO_TOTAL_GB, DEMO_USED_GB } from '@/data/storage'
import { useInView } from '@/hooks/useInView'
import { cx, formatGb } from '@/utils/format'

type Mode = 'used' | 'recoverable' | 'free'

const MODES: Mode[] = ['used', 'recoverable', 'free']

const R = 88
const C = 2 * Math.PI * R
const GAP = 2.2
const FREE_COLOR = 'var(--ring-free)'

interface Seg {
  id: string
  color: string
  start: number
  len: number
  innerLen: number
}

function buildSegments(): Seg[] {
  let offset = 0
  return DEMO_CATEGORIES.map((c) => {
    const len = (c.gb / DEMO_TOTAL_GB) * C
    const seg = { id: c.id, color: c.color, start: offset, len: Math.max(0, len - GAP), innerLen: Math.max(0, (c.reclaimableGb / DEMO_TOTAL_GB) * C - GAP) }
    offset += len
    return seg
  })
}

const SEGMENTS = buildSegments()
const FREE_START = (DEMO_USED_GB / DEMO_TOTAL_GB) * C
const FREE_LEN = (DEMO_FREE_GB / DEMO_TOTAL_GB) * C - GAP
const MAX_GB = Math.max(...DEMO_CATEGORIES.map((c) => c.gb))

/**
 * An interactive, illustrative take on the app's Storage screen. Uses the
 * same categories and colors as the app; numbers are a labeled example.
 */
export function StorageVisualization() {
  const { t } = useTranslation('home')
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.3 })
  const [mode, setMode] = useState<Mode>('used')
  const [active, setActive] = useState<string | null>(null)

  const catLabel = (id: string) => t(`storageViz.categories.${id}.label`)
  const catNote = (id: string) => t(`storageViz.categories.${id}.note`)
  const activeCat = DEMO_CATEGORIES.find((c) => c.id === active) ?? null

  let centerLabel = t('storageViz.centerLabels.used')
  let centerValue = DEMO_USED_GB
  let centerSub = t('storageViz.ofTotal', { total: DEMO_TOTAL_GB })
  if (activeCat) {
    centerLabel = catLabel(activeCat.id)
    centerValue = mode === 'recoverable' ? activeCat.reclaimableGb : activeCat.gb
    centerSub = mode === 'recoverable' ? t('storageViz.potentiallyRecoverable') : t('storageViz.percentOfDisk', { percent: Math.round((activeCat.gb / DEMO_TOTAL_GB) * 100) })
  } else if (mode === 'recoverable') {
    centerLabel = t('storageViz.centerLabels.recoverable')
    centerValue = DEMO_RECLAIMABLE_GB
    centerSub = t('storageViz.afterReview')
  } else if (mode === 'free') {
    centerLabel = t('storageViz.centerLabels.free')
    centerValue = DEMO_FREE_GB
    centerSub = t('storageViz.ofTotal', { total: DEMO_TOTAL_GB })
  }

  return (
    <div ref={ref} className={cx('storage-viz', `mode-${mode}`, inView && 'is-in')} style={{ '--C': C } as CSSProperties}>
      <div className="storage-viz__modes segmented" role="radiogroup" aria-label={t('storageViz.modes.used')}>
        {MODES.map((m) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} className={cx('segmented__opt', mode === m && 'is-active')} onClick={() => setMode(m)}>
            {t(`storageViz.modes.${m}`)}
          </button>
        ))}
      </div>

      <div className="storage-viz__body">
        <div className="storage-viz__ring">
          <svg viewBox="0 0 220 220" role="img" aria-label={t('storageViz.diskAriaLabel', { used: DEMO_USED_GB.toFixed(1), free: DEMO_FREE_GB.toFixed(1), recoverable: DEMO_RECLAIMABLE_GB.toFixed(1) })}>
            <circle cx="110" cy="110" r={R} className="ring-track" />
            <g transform="rotate(-90 110 110)">
              {SEGMENTS.map((s, i) => (
                <circle
                  key={s.id}
                  cx="110"
                  cy="110"
                  r={R}
                  className={cx('ring-seg', active === s.id && 'is-active', active && active !== s.id && 'is-dim')}
                  stroke={s.color}
                  style={{ '--len': s.len, strokeDashoffset: -s.start, transitionDelay: `${i * 70}ms` } as CSSProperties}
                />
              ))}
              <circle cx="110" cy="110" r={R} className="ring-seg ring-seg--free" stroke={FREE_COLOR} style={{ '--len': FREE_LEN, strokeDashoffset: -FREE_START, transitionDelay: '560ms' } as CSSProperties} />
              {SEGMENTS.filter((s) => s.innerLen > 0).map((s) => (
                <circle
                  key={`${s.id}-inner`}
                  cx="110"
                  cy="110"
                  r={R - 22}
                  className={cx('ring-inner', active && active !== s.id && 'is-dim')}
                  stroke={s.color}
                  style={{ strokeDasharray: `${(s.innerLen * (R - 22)) / R} ${C}`, strokeDashoffset: (-s.start * (R - 22)) / R } as CSSProperties}
                />
              ))}
            </g>
          </svg>
          <div className="storage-viz__center" aria-live="polite">
            <small>{centerLabel}</small>
            <b>
              {centerValue.toFixed(1)}
              <span> GB</span>
            </b>
            <em>{centerSub}</em>
          </div>
        </div>

        <ul className="storage-viz__legend">
          {DEMO_CATEGORIES.map((c) => {
            const value = mode === 'recoverable' ? c.reclaimableGb : c.gb
            const width = mode === 'recoverable' ? (c.reclaimableGb / MAX_GB) * 100 : (c.gb / MAX_GB) * 100
            return (
              <li key={c.id}>
                <button
                  type="button"
                  className={cx('legend-row', active === c.id && 'is-active', mode === 'recoverable' && c.reclaimableGb === 0 && 'is-muted')}
                  onMouseEnter={() => setActive(c.id)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(c.id)}
                  onBlur={() => setActive(null)}
                  aria-label={t('storageViz.legendAriaLabel', { label: catLabel(c.id), used: formatGb(c.gb), recoverable: formatGb(c.reclaimableGb), note: catNote(c.id) })}
                  style={{ '--c': c.color } as CSSProperties}
                >
                  <span className="legend-row__swatch" aria-hidden="true" />
                  <span className="legend-row__label">{catLabel(c.id)}</span>
                  <span className="legend-row__value">{mode === 'recoverable' && c.reclaimableGb === 0 ? '—' : formatGb(value)}</span>
                  <span className="legend-row__bar" aria-hidden="true">
                    <i style={{ '--w': `${width}%` } as CSSProperties} />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <p className="storage-viz__note">{activeCat ? catNote(activeCat.id) : t('storageViz.defaultNote')}</p>
    </div>
  )
}
