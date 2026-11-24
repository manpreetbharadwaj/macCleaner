import { useTranslation } from 'react-i18next'
import { Check, Info, KeyRound, Sparkles } from 'lucide-react'
import { PURCHASE } from '@/config/site'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'
import { FinalCta } from '@/sections/FinalCta'

export function PricingPage() {
  const { t } = useTranslation('pricing')
  const price = PURCHASE.priceDisplay
  const trialDays = PURCHASE.trialDays
  const checks = t('checks', { returnObjects: true, price, trialDays }) as string[]

  return (
    <div className="page">
      <section className="page-hero">
        <div className="container container--narrow">
          <SectionHeading
            level={1}
            eyebrow={t('eyebrow')}
            title={
              <>
                {t('title1')}
                <span className="grad-text">{t('title2', { price })}</span>
                {t('titleSuffix')}
              </>
            }
            intro={t('intro', { trialDays, price })}
          />
        </div>
      </section>

      <section className="section section--tint" aria-labelledby="included-title">
        <div className="container container--narrow">
          <Reveal className="extra">
            <h2 id="included-title" className="display-3">
              {t('includedTitle')}
            </h2>
            <ul className="checks">
              {checks.map((c) => (
                <li key={c}>
                  <Check size={18} aria-hidden="true" /> {c}
                </li>
              ))}
            </ul>

            <div className="cta-card__actions" style={{ marginTop: '1.75rem' }}>
              {PURCHASE.isSandbox ? (
                <button type="button" className="btn btn--primary btn--lg" disabled aria-disabled="true" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                  <Sparkles size={16} aria-hidden="true" /> {t('buyButton', { price })}
                </button>
              ) : (
                <a className="btn btn--primary btn--lg" href={PURCHASE.checkoutUrl} target="_blank" rel="noopener noreferrer">
                  <Sparkles size={16} aria-hidden="true" /> {t('buyButton', { price })}
                </a>
              )}
            </div>
            <p className="download-hero__note">{t('priceNote')}</p>
            <p className="download-hero__note">
              <KeyRound size={18} aria-hidden="true" />
              {t('alreadyPurchased')}
            </p>

            {PURCHASE.isSandbox && (
              <p className="download-hero__note">
                <Info size={18} aria-hidden="true" />
                {t('sandboxNote')}
              </p>
            )}
          </Reveal>
        </div>
      </section>

      <FinalCta title={t('ctaTitle', { trialDays })} />
    </div>
  )
}
