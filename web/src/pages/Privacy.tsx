import { Trans, useTranslation } from 'react-i18next'
import { APP, SITE } from '@/config/site'
import { LegalLayout, type LegalSection } from '@/components/LegalLayout'
import { LegalBlocks } from '@/components/LegalBlocks'
import { Link } from '@/components/router'

const SECTION_IDS = [
  'who-we-are',
  'app-local',
  'app-stored',
  'app-network',
  'app-cleaning',
  'app-permissions',
  'app-device',
  'system-monitoring',
  'app-sharing-logs',
  'website',
  'website-cookies',
  'third-parties',
  'legal-bases',
  'retention',
  'security',
  'your-rights',
  'children',
  'international',
  'changes',
  'contact',
]

export function PrivacyPage() {
  const { t } = useTranslation('privacy')
  const appSupport = `~/Library/Application Support/${APP.bundleId}`
  const appLogs = `~/Library/Logs/${APP.bundleId}`

  const values = {
    siteName: SITE.name,
    companyName: SITE.companyName,
    companyAddress: SITE.companyAddress,
    siteHost: SITE.url.replace(/^https?:\/\//, ''),
    appSupport,
    appLogs,
    hostingProvider: SITE.hostingProvider,
    downloadHost: SITE.downloadHost,
    privacyEmail: SITE.privacyEmail,
  }
  const components = {
    b: <b />,
    code: <code />,
    'link-faq-automatic': <Link to="/faq#automatic" />,
  }

  const sections: LegalSection[] = SECTION_IDS.map((id) => ({
    id,
    title: t(`sections.${id}.title`),
    body: <LegalBlocks t={t} ns="privacy" path={`sections.${id}.body`} values={values} components={components} />,
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
        </div>
      }
      sections={sections}
    />
  )
}
