import { Trans, useTranslation } from 'react-i18next'
import { APP, SITE } from '@/config/site'
import { LegalLayout, type LegalSection } from '@/components/LegalLayout'
import { LegalBlocks } from '@/components/LegalBlocks'
import { Link } from '@/components/router'

const SECTION_IDS = [
  'acceptance',
  'license',
  'restrictions',
  'price',
  'your-responsibility',
  'backups',
  'no-guarantee',
  'updates',
  'early-release',
  'privacy',
  'ip',
  'apple',
  'feedback',
  'warranty',
  'liability',
  'termination',
  'governing-law',
  'changes',
  'general',
  'contact',
]

export function TermsPage() {
  const { t } = useTranslation('terms')

  const values = {
    siteName: SITE.name,
    companyName: SITE.companyName,
    companyAddress: SITE.companyAddress,
    version: APP.version,
    jurisdiction: SITE.jurisdiction,
    supportEmail: SITE.supportEmail,
    notarizedNote: APP.notarized ? '' : t('sections.early-release.notarizedNote'),
  }
  const components = {
    b: <b />,
    'link-support': <Link to="/support" />,
    'link-privacy': <Link to="/privacy" />,
  }

  const sections: LegalSection[] = SECTION_IDS.map((id) => ({
    id,
    title: t(`sections.${id}.title`),
    body: <LegalBlocks t={t} ns="terms" path={`sections.${id}.body`} values={values} components={components} />,
  }))

  return (
    <LegalLayout
      title={t('title')}
      legalReviewNotice={t('legalReviewNotice')}
      intro={
        <div className="summary-box">
          <p>
            <Trans t={t} i18nKey="shortVersion" values={{ siteName: SITE.name }} components={{ b: <b /> }} />
          </p>
          <p className="summary-box__note">{t('shortVersionNote')}</p>
        </div>
      }
      sections={sections}
    />
  )
}
