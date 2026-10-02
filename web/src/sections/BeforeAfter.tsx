import { useState, type CSSProperties } from 'react'
import { Check, HelpCircle, X } from 'lucide-react'
import { DEMO_CATEGORIES } from '@/data/storage'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'

const BEFORE = ['Storage bar says “System Data” and little else', 'Large files buried deep inside folders', 'Caches and logs piling up unnoticed', 'Old installers and disk images in Downloads', 'No idea what’s safe to remove']
const AFTER = ['Every category measured and labeled', 'Biggest files listed first, with Quick Look', 'Caches grouped and marked Safe or Review', 'Downloads sorted by age and type', 'Space recovered on your terms — via the Trash']

const MESSY = ['IMG_4288 copy 2.jpg', 'Install_Tool_v3.dmg', 'export-final-FINAL.mov', 'Archive (4).zip', 'com.vendor.helper', 'DerivedData', 'Untitled 7.pdf', 'screen-rec-0412.mov', 'node_modules.zip', 'Library/Caches', 'setup.pkg', 'IMG_4288.jpg']

/**
 * Drag-to-compare illustration. Purely conceptual — it shows how the app
 * organizes storage, not a measured before/after result.
 */
export function BeforeAfter() {
  const [split, setSplit] = useState(50)

  return (
    <section className="section section--tint" aria-labelledby="ba-title">
      <div className="container">
        <SectionHeading eyebrow="Before & after" id="ba-title" title="From “where did it all go?” to “oh, that’s where.”" intro="Drag the handle to compare. MacBook Cleaner doesn’t make your disk bigger — it makes it understandable, so recovering space is a decision instead of a guess." />

        <Reveal className="compare" style={{ '--split': `${split}%` } as CSSProperties}>
          <div className="compare__pane compare__pane--before" aria-hidden="true">
            <span className="compare__tag">Before</span>
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
                <HelpCircle size={13} /> System Data: ???
              </small>
            </div>
          </div>
          <div className="compare__pane compare__pane--after" aria-hidden="true">
            <span className="compare__tag compare__tag--after">After</span>
            <div className="tidy">
              {DEMO_CATEGORIES.slice(0, 6).map((c) => (
                <div key={c.id} className="tidy__row" style={{ '--c': c.color } as CSSProperties}>
                  <span className="tidy__dot" />
                  <span className="tidy__label">{c.label}</span>
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
          <input className="compare__range" type="range" min={5} max={95} value={split} onChange={(e) => setSplit(Number(e.target.value))} aria-label="Compare before and after" />
        </Reveal>

        <div className="ba-lists">
          <Reveal className="ba-list ba-list--before">
            <h3>Without a clear view</h3>
            <ul>
              {BEFORE.map((b) => (
                <li key={b}>
                  <X size={16} aria-hidden="true" /> {b}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal className="ba-list ba-list--after" delay={80}>
            <h3>With MacBook Cleaner</h3>
            <ul>
              {AFTER.map((a) => (
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
