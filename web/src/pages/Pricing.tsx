import { Check, Info, KeyRound, Sparkles } from 'lucide-react'
import { PURCHASE } from '@/config/site'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'
import { FinalCta } from '@/sections/FinalCta'

export function PricingPage() {
  return (
    <div className="page">
      <section className="page-hero">
        <div className="container container--narrow">
          <SectionHeading
            level={1}
            eyebrow="Pricing"
            title={<>Try it free, then <span className="grad-text">{PURCHASE.priceDisplay}</span> once</>}
            intro={`Every feature works during a ${PURCHASE.trialDays}-day free trial — no account or credit card to start. After that, a single ${PURCHASE.priceDisplay} payment unlocks MacBook Cleaner for good: no subscription, no renewal, ever.`}
          />
        </div>
      </section>

      <section className="section section--tint" aria-labelledby="included-title">
        <div className="container container--narrow">
          <Reveal className="extra">
            <h2 id="included-title" className="display-3">One license. One Mac. Forever.</h2>
            <ul className="checks">
              <li><Check size={18} aria-hidden="true" /> {PURCHASE.priceDisplay} one-time purchase — not a subscription</li>
              <li><Check size={18} aria-hidden="true" /> Lifetime license, no expiration, no renewal</li>
              <li><Check size={18} aria-hidden="true" /> {PURCHASE.trialDays}-day free trial, full features, no account needed to start</li>
              <li><Check size={18} aria-hidden="true" /> Licensed for one Mac at a time — deactivate and transfer to a new Mac anytime</li>
              <li><Check size={18} aria-hidden="true" /> License key delivered by email right after payment</li>
            </ul>

            <div className="cta-card__actions" style={{ marginTop: '1.75rem' }}>
              <a className="btn btn--primary btn--lg" href={PURCHASE.checkoutUrl} target="_blank" rel="noopener noreferrer">
                <Sparkles size={16} aria-hidden="true" /> Buy Lifetime License — {PURCHASE.priceDisplay}
              </a>
            </div>
            <p className="download-hero__note">{PURCHASE.priceNote}</p>
            <p className="download-hero__note">
              <KeyRound size={18} aria-hidden="true" />
              Already purchased? Activate your license key from inside the app — Settings → License.
            </p>

            {PURCHASE.isSandbox && (
              <p className="download-hero__note">
                <Info size={18} aria-hidden="true" />
                This Buy button currently opens Dodo Payments' <strong>test/sandbox</strong> checkout for integration testing — no real charge will be made. It will be switched to the live checkout before launch.
              </p>
            )}
          </Reveal>
        </div>
      </section>

      <FinalCta title={`Download, try it free for ${PURCHASE.trialDays} days, decide later.`} />
    </div>
  )
}
