import { Link } from 'react-router'
import { ALL_FAQS, HOME_FAQ_IDS } from '@/data/faq'
import { FAQAccordion } from '@/components/FAQAccordion'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'

export function FaqPreview() {
  const items = HOME_FAQ_IDS.map((id) => ALL_FAQS.find((f) => f.id === id)).filter((f): f is (typeof ALL_FAQS)[number] => !!f)
  return (
    <section className="section" aria-labelledby="faq-preview-title">
      <div className="container container--narrow">
        <SectionHeading eyebrow="FAQ" id="faq-preview-title" title="Questions, answered." />
        <Reveal>
          <FAQAccordion items={items} />
        </Reveal>
        <p className="center-link">
          <Link to="/faq" className="text-link">
            See all questions →
          </Link>
        </p>
      </div>
    </section>
  )
}
