import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Loader2, RotateCcw, ScanSearch, Sparkles } from 'lucide-react'
import { DEMO_SCAN_STEPS, DEMO_USED_GB } from '@/data/storage'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'
import { useCountUp } from '@/hooks/useCountUp'
import { useInView } from '@/hooks/useInView'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cx } from '@/utils/format'

const STEP_MS = 650
const TOTAL_FOUND = DEMO_SCAN_STEPS.reduce((s, x) => s + x.gb, 0)
const TOTAL_SAFE = DEMO_SCAN_STEPS.reduce((s, x) => s + x.safeGb, 0)
const TOTAL_ITEMS = DEMO_SCAN_STEPS.reduce((s, x) => s + x.items, 0)

const STEP_LABEL_KEYS: Record<string, string> = {
  'system-junk': 'systemJunk',
  browser: 'browserCaches',
  leftovers: 'appLeftovers',
  logs: 'logsCrashReports',
  developer: 'developerJunk',
  downloads: 'oldDownloads',
}

/**
 * A lightweight, illustrative replay of a Smart Clean scan. The categories
 * and figures come from the app's built-in sample data — the same data
 * shown in the screenshots — not from a real Mac.
 */
export function ScanDemo() {
  const { t } = useTranslation('home')
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.35 })
  const reduced = useReducedMotion()
  // -1: not started; 0..n-1: scanning step i; n: done
  const [step, setStep] = useState(-1)
  const [run, setRun] = useState(0)
  const timer = useRef<number | undefined>(undefined)
  const n = DEMO_SCAN_STEPS.length
  const done = step >= n

  useEffect(() => {
    if (!inView) return
    if (reduced) {
      setStep(n)
      return
    }
    setStep(0)
    let i = 0
    timer.current = window.setInterval(() => {
      i += 1
      setStep(i)
      if (i >= n) window.clearInterval(timer.current)
    }, STEP_MS)
    return () => window.clearInterval(timer.current)
  }, [inView, reduced, run, n])

  const foundSoFar = DEMO_SCAN_STEPS.slice(0, Math.max(0, Math.min(step, n))).reduce((s, x) => s + x.gb, 0)
  const scanned = useCountUp(DEMO_USED_GB, step >= 0, STEP_MS * n, reduced)
  const safe = useCountUp(TOTAL_SAFE, done, 900, reduced)
  const progress = step < 0 ? 0 : Math.min(1, step / n)

  return (
    <section className="section" aria-labelledby="demo-title">
      <div className="container demo">
        <div className="demo__copy">
          <SectionHeading
            align="left"
            eyebrow={t('scanDemo.eyebrow')}
            id="demo-title"
            title={
              <>
                {t('scanDemo.title1')}
                <span className="grad-text">{t('scanDemo.title2')}</span>
              </>
            }
            intro={t('scanDemo.intro')}
          />
          <Reveal className="demo__flow" delay={80}>
            <div className={cx('flow-stat', step >= 0 && 'is-on')}>
              <small>{t('scanDemo.storageAnalyzed')}</small>
              <b>{scanned.toFixed(0)} GB</b>
            </div>
            <span className="flow-arrow" aria-hidden="true" />
            <div className={cx('flow-stat', done && 'is-on')}>
              <small>{t('scanDemo.itemsFound')}</small>
              <b>{done ? TOTAL_ITEMS : '—'}</b>
            </div>
            <span className="flow-arrow" aria-hidden="true" />
            <div className={cx('flow-stat flow-stat--accent', done && 'is-on')}>
              <small>{t('scanDemo.safeToClean')}</small>
              <b>{done ? `${safe.toFixed(1)} GB` : '—'}</b>
            </div>
          </Reveal>
        </div>

        <Reveal delay={100}>
          <div ref={ref} className="scan-card" style={{ '--progress': progress } as CSSProperties}>
            <div className="scan-card__head">
              <span className={cx('scan-card__icon', !done && step >= 0 && 'is-spinning')} aria-hidden="true">
                {done ? <Sparkles size={20} /> : <ScanSearch size={20} />}
              </span>
              <div>
                <p className="scan-card__title" aria-live="polite">
                  {done ? t('scanDemo.canFreeUp', { total: TOTAL_FOUND.toFixed(1) }) : step >= 0 ? t('scanDemo.scanning') : t('scanDemo.readyToScan')}
                </p>
                <p className="scan-card__sub">{done ? t('scanDemo.safeSummary', { amount: TOTAL_SAFE.toFixed(1) }) : t('scanDemo.foundSoFar', { amount: foundSoFar.toFixed(1) })}</p>
              </div>
            </div>
            <div className="scan-card__progress" aria-hidden="true">
              <i />
            </div>
            <ul className="scan-card__list">
              {DEMO_SCAN_STEPS.map((s, i) => {
                const state = step > i ? 'done' : step === i ? 'active' : 'pending'
                return (
                  <li key={s.id} className={cx('scan-row', `is-${state}`)} style={{ '--c': s.color } as CSSProperties}>
                    <span className="scan-row__dot" aria-hidden="true">
                      {state === 'done' ? <Check size={13} strokeWidth={3} /> : state === 'active' ? <Loader2 size={13} className="spin" /> : null}
                    </span>
                    <span className="scan-row__label">{t(`scanDemo.steps.${STEP_LABEL_KEYS[s.id]}`, { defaultValue: s.label })}</span>
                    <span className="scan-row__meta">
                      {state === 'done' ? (
                        <>
                          <em>
                            {s.items} {t('scanDemo.items')}
                          </em>{' '}
                          {s.gb.toFixed(1)} GB
                        </>
                      ) : state === 'active' ? (
                        t('scanDemo.checking')
                      ) : (
                        ''
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
            <div className="scan-card__foot">
              <small>{t('scanDemo.footNote')}</small>
              <button type="button" className="btn btn--soft btn--sm" onClick={() => setRun((r) => r + 1)} disabled={!done}>
                <RotateCcw size={14} aria-hidden="true" /> {t('scanDemo.replay')}
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
