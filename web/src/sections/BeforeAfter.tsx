import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, HelpCircle, X } from 'lucide-react'
import { DEMO_CATEGORIES } from '@/data/storage'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'

const MESSY = ['IMG_4288 copy 2.jpg', 'Install_Tool_v3.dmg', 'export-final-FINAL.mov', 'Archive (4).zip', 'com.vendor.helper', 'DerivedData', 'Untitled 7.pdf', 'screen-rec-0412.mov', 'node_modules.zip', 'Library/Caches', 'setup.pkg', 'IMG_4288.jpg']

/**
 * Drag-to-compare illustration. Purely conceptual — it shows how the app
 * organizes storage, not a measured before/after result.
 */
export function BeforeAfter() {
  const { t } = useTranslation('home')
  const [split, setSplit] = useState(50)
  const before = t('beforeAfter.beforeList', { returnObjects: true }) as string[]
  const after = t('beforeAfter.afterList', { returnObjects: true }) as string[]

  return (
    <section className="section section--tint" aria-labelledby="ba-title">
      <div className="container">
        <SectionHeading eyebrow={t('beforeAfter.eyebrow')} id="ba-title" title={t('beforeAfter.title')} intro={t('beforeAfter.intro')} />

        <Reveal className="compare" style={{ '--split': `${split}%` } as CSSProperties}>
          <div className="compare__pane compare__pane--before" aria-hidden="true">
            <span className="compare__tag">{t('beforeAfter.before')}</span>
            <div className="mess">
              {MESSY.map((m, i) => (
                <span key={m} className="mess__chip" style={{ '--i': i } as CSSProperties}>
                  {m}
                </span>
              ))}
            </div>
            <div className="mess__bar">
              <span style={{ width: '18%' }} />
              <span style={{ width: '64%' }} />
              <small>
                <HelpCircle size={13} /> {t('beforeAfter.systemDataUnknown')}
              </small>
            </div>
          </div>
          <div className="compare__pane compare__pane--after" aria-hidden="true">
            <span className="compare__tag compare__tag--after">{t('beforeAfter.after')}</span>
            <div className="tidy">
              {DEMO_CATEGORIES.slice(0, 6).map((c) => (
                <div key={c.id} className="tidy__row" style={{ '--c': c.color } as CSSProperties}>
                  <span className="tidy__dot" />
                  <span className="tidy__label">{t(`storageViz.categories.${c.id}.label`, { ns: 'home' })}</span>
                  <span className="tidy__bar">
                    <i style={{ width: `${(c.gb / 34.5) * 100}%` }} />
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="compare__handle" aria-hidden="true">
            <span />
          </div>
          <input className="compare__range" type="range" min={5} max={95} value={split} onChange={(e) => setSplit(Number(e.target.value))} aria-label={t('beforeAfter.title')} />
        </Reveal>

        <div className="ba-lists">
          <Reveal className="ba-list ba-list--before">
            <h3>{t('beforeAfter.withoutClearView')}</h3>
            <ul>
              {before.map((b) => (
                <li key={b}>
                  <X size={16} aria-hidden="true" /> {b}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal className="ba-list ba-list--after" delay={80}>
            <h3>{t('beforeAfter.withApp')}</h3>
            <ul>
              {after.map((a) => (
                <li key={a}>
                  <Check size={16} aria-hidden="true" /> {a}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
