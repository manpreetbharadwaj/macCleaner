import { useEffect, useId, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { ChevronDown } from 'lucide-react'
import type { FaqItem } from '@/data/faq'
import { cx } from '@/utils/format'

/**
 * Accessible accordion: real <button>s with aria-expanded/aria-controls,
 * and answers stay in the DOM (and in the prerendered HTML) for search
 * engines and find-in-page — collapsed ones are just visually hidden.
 */
export function FAQAccordion({ items, defaultOpen }: { items: FaqItem[]; defaultOpen?: string }) {
  const [openId, setOpenId] = useState<string | null>(defaultOpen ?? null)
  const baseId = useId()
  const { hash } = useLocation()

  // Deep links like /faq#safe open the matching answer (on load and on in-page hash changes).
  useEffect(() => {
    const id = decodeURIComponent(hash.slice(1))
    if (id && items.some((i) => i.id === id)) setOpenId(id)
  }, [hash, items])

  return (
    <div className="faq">
      {items.map((item) => {
        const open = openId === item.id
        const panelId = `${baseId}-${item.id}-panel`
        const buttonId = `${baseId}-${item.id}-button`
        return (
          <div key={item.id} id={item.id} className={cx('faq__item', open && 'is-open')}>
            <h3 className="faq__q">
              <button id={buttonId} type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpenId(open ? null : item.id)}>
                <span>{item.question}</span>
                <ChevronDown size={20} aria-hidden="true" className="faq__chev" />
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={buttonId} className="faq__panel" inert={!open}>
              <div className="faq__panel-inner">
                {item.answer.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
                {item.link && (
                  <p>
                    <Link to={item.link.to} className="text-link">
                      {item.link.label} →
                    </Link>
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
