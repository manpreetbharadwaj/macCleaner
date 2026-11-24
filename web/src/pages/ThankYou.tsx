import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy, KeyRound, Mail } from 'lucide-react'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'

/** Dodo Payments redirects here after a successful purchase (and appends
 * `license_key` to the URL, when the product issues one) — see
 * src-tauri/src/license/config.rs's THANK_YOU_URL and `license_open_purchase_page`. */
function usePurchaseDetails() {
  const [params, setParams] = useState<{ licenseKey: string | null; email: string | null }>({ licenseKey: null, email: null })
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    setParams({ licenseKey: q.get('license_key'), email: q.get('email') })
  }, [])
  return params
}

function CopyButton({ value }: { value: string }) {
  const { t } = useTranslation('thankYou')
  const [copied, setCopied] = useState(false)
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can be blocked — the key is still selectable/visible as text.
    }
  }
  return (
    <button type="button" className="btn btn--primary btn--sm" onClick={onCopy}>
      {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
      {copied ? t('copied') : t('copy')}
    </button>
  )
}

export function ThankYouPage() {
  const { t } = useTranslation('thankYou')
  const { licenseKey, email } = usePurchaseDetails()
  const steps = t('activateSteps', { returnObjects: true }) as string[]

  return (
    <div className="page">
      <section className="page-hero">
        <div className="container container--narrow">
          <SectionHeading level={1} eyebrow={t('eyebrow')} title={t('title')} intro={t('intro')} />
        </div>
      </section>

      <section className="section" aria-labelledby="license-key-title">
        <div className="container container--narrow">
          <Reveal className="glass-card" style={{ padding: '2rem' }}>
            {licenseKey ? (
              <>
                <h2 id="license-key-title" className="display-3" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <KeyRound size={22} aria-hidden="true" /> {t('licenseKeyTitle')}
                </h2>
                <div
                  className="selectable"
                  style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', padding: '1rem 1.25rem', borderRadius: '12px', background: 'var(--surface-2, rgba(0,0,0,0.04))', fontFamily: 'ui-monospace, monospace', fontSize: '1.05rem', letterSpacing: '0.02em' }}
                >
                  <span>{licenseKey}</span>
                  <CopyButton value={licenseKey} />
                </div>
                {email && <p className="download-hero__note">{t('sentCopyTo', { email })}</p>}
              </>
            ) : (
              <>
                <h2 id="license-key-title" className="display-3" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Mail size={22} aria-hidden="true" /> {t('checkEmailTitle')}
                </h2>
                <p className="lead" style={{ marginTop: '0.75rem' }}>
                  {t('noKeyFound')}
                </p>
              </>
            )}

            <h3 style={{ marginTop: '2rem', fontSize: '1.05rem' }}>{t('howToActivate')}</h3>
            <ol className="quick-steps" aria-label={t('howToActivate')}>
              {steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>

            <p className="download-hero__note">{t('oneMacNote')}</p>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
