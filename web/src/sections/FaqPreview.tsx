import { useTranslation } from 'react-i18next'
import { useHomeFaqs } from '@/data/faq'
import { FAQAccordion } from '@/components/FAQAccordion'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'
import { Link } from '@/components/router'

export function FaqPreview() {
  const { t } = useTranslation('home')
  const items = useHomeFaqs()
  return (
    <section className="section" aria-labelledby="faq-preview-title">
      <div className="container container--narrow">
        <SectionHeading eyebrow={t('faqPreview.eyebrow')} id="faq-preview-title" title={t('faqPreview.title')} />
        <Reveal>
          <FAQAccordion items={items} />
        </Reveal>
        <p className="center-link">
          <Link to="/faq" className="text-link">
            {t('faqPreview.seeAll')}
          </Link>
        </p>
      </div>
    </section>
  )
}
