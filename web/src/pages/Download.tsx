import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { AlertTriangle, Calendar, CheckCircle2, Cpu, Download as DownloadIcon, FolderInput, HardDrive, Info, MousePointerClick, RefreshCw, Rocket, ShieldCheck, Tag } from 'lucide-react'
import { APP, DOWNLOAD, architectureLabel } from '@/config/site'
import { DownloadButton } from '@/components/DownloadButton'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'
import { Link } from '@/components/router'

const INSTALL_ICONS = [DownloadIcon, MousePointerClick, FolderInput, Rocket]

function useDownloadStarted(): boolean {
  // Read after mount: the page is prerendered without a query string.
  const [started, setStarted] = useState(false)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('started') === '1') setStarted(true)
  }, [])
  return started
}

export function DownloadPage() {
  const { t } = useTranslation('download')
  const started = useDownloadStarted()
  const installSteps = t('install.steps', { returnObjects: true }) as { title: string; body: string }[]
  const gatekeeperSteps = t('gatekeeper.steps', { returnObjects: true }) as string[]

  return (
    <div className="page">
      <section className="page-hero page-hero--download">
        <div className="container">
          <Reveal className="download-hero">
            <img src="/app-icon-256.png" alt={t('hero.iconAlt')} width={128} height={128} className="download-hero__icon" />
            <h1 className="display-1">{t('hero.title')}</h1>
            <p className="lead">{t('hero.lead')}</p>
            {started && (
              <p className="download-started" role="status">
                <CheckCircle2 size={18} aria-hidden="true" />
                <span>
                  <Trans t={t} i18nKey="hero.started" values={{ fileName: DOWNLOAD.fileName }} components={{ b: <b /> }} />
                </span>
              </p>
            )}
            <div className="download-hero__cta">
              <DownloadButton />
            </div>
            <p className="download-hero__file">{t('hero.fileInfo', { fileName: DOWNLOAD.fileName, sizePart: DOWNLOAD.size ? ` · ${DOWNLOAD.size}` : '' })}</p>
            <ol className="quick-steps" aria-label={t('install.title')}>
              <li>{t('hero.quickSteps.0')}</li>
              <li>{t('hero.quickSteps.1')}</li>
              <li>{t('hero.quickSteps.2')}</li>
              <li>{APP.notarized ? t('hero.quickStepsNotarizedLast') : <Trans t={t} i18nKey="hero.quickStepsUnnotarizedLast" components={{ a: <a href="#open-anyway" /> }} />}</li>
            </ol>
            <ul className="spec-row" aria-label={t('hero.releaseDetailsAria')}>
              <li>
                <Tag size={15} aria-hidden="true" /> {t('hero.specs.version', { version: APP.version })}
              </li>
              {(DOWNLOAD.releaseDate || DOWNLOAD.buildDate) && (
                <li>
                  <Calendar size={15} aria-hidden="true" /> {DOWNLOAD.releaseDate ? t('hero.specs.released', { date: DOWNLOAD.releaseDate }) : t('hero.specs.built', { date: DOWNLOAD.buildDate })}
                </li>
              )}
              <li>
                <HardDrive size={15} aria-hidden="true" /> {t('hero.specs.macos', { macos: APP.minMacOSName })}
              </li>
              <li>
                <Cpu size={15} aria-hidden="true" /> {architectureLabel()}
              </li>
              {DOWNLOAD.size && (
                <li>
                  <DownloadIcon size={15} aria-hidden="true" /> {DOWNLOAD.size}
                </li>
              )}
            </ul>
            <p className="download-hero__links">
              <Link to="/changelog">{t('hero.links.releaseNotes')}</Link>
              <span aria-hidden="true">·</span>
              <Link to="/privacy">{t('hero.links.privacy')}</Link>
              <span aria-hidden="true">·</span>
              <Link to="/terms">{t('hero.links.terms')}</Link>
            </p>
            {DOWNLOAD.sha256 && (
              <p className="checksum">
                {t('hero.checksumLabel')}: <code>{DOWNLOAD.sha256}</code>
              </p>
            )}
          </Reveal>
        </div>
      </section>

      <section className="section" aria-labelledby="req-title">
        <div className="container container--narrow">
          <SectionHeading eyebrow={t('requirements.eyebrow')} id="req-title" title={t('requirements.title')} />
          <Reveal className="req-grid">
            <div className="req">
              <HardDrive size={22} aria-hidden="true" />
              <h3>{t('requirements.macos')}</h3>
              <p>{t('requirements.macosValue', { macosName: APP.minMacOSName, macosVersion: APP.minMacOS })}</p>
            </div>
            <div className="req">
              <Cpu size={22} aria-hidden="true" />
              <h3>{t('requirements.processor')}</h3>
              <p>{architectureLabel()}</p>
              {APP.installerVerified && !APP.architectures.includes('intel') && <small>{t('requirements.intelNote')}</small>}
            </div>
            <div className="req">
              <ShieldCheck size={22} aria-hidden="true" />
              <h3>{t('requirements.account')}</h3>
              <p>{t('requirements.accountValue')}</p>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="install" className="section section--tint" aria-labelledby="install-title">
        <div className="container">
          <SectionHeading eyebrow={t('install.eyebrow')} id="install-title" title={t('install.title')} />
          <ol className="install-steps">
            {installSteps.map((s, i) => {
              const Icon = INSTALL_ICONS[i]
              return (
                <Reveal as="li" key={s.title} className="install-step" delay={i * 80}>
                  <span className="install-step__num" aria-hidden="true">
                    {i + 1}
                  </span>
                  <Icon size={24} aria-hidden="true" className="install-step__icon" />
                  <h3>{s.title}</h3>
                  <p>
                    <Trans t={t} i18nKey={`install.steps.${i}.body`} values={{ fileName: DOWNLOAD.fileName }} components={{ b: <b />, code: <code /> }} />
                  </p>
                </Reveal>
              )
            })}
          </ol>
        </div>
      </section>

      {!APP.notarized && (
        <section id="open-anyway" className="section" aria-labelledby="gatekeeper-title">
          <div className="container container--narrow">
            <SectionHeading eyebrow={t('gatekeeper.eyebrow')} id="gatekeeper-title" title={t('gatekeeper.title')} intro={t('gatekeeper.intro')} />
            <Reveal className="notice">
              <AlertTriangle size={22} aria-hidden="true" />
              <div>
                <h3>{t('gatekeeper.noticeTitle')}</h3>
                <p>{t('gatekeeper.noticeBody1')}</p>
                <p>
                  <Trans t={t} i18nKey="gatekeeper.noticeBody2" components={{ b: <b /> }} />
                </p>
              </div>
            </Reveal>

            <Reveal className="howto" delay={60}>
              <h3>{t('gatekeeper.howtoTitle')}</h3>
              <ol>
                {gatekeeperSteps.map((_, i) => (
                  <li key={i}>
                    <Trans t={t} i18nKey={`gatekeeper.steps.${i}`} components={{ b: <b /> }} />
                  </li>
                ))}
              </ol>
              <p className="howto__tip">
                <Trans t={t} i18nKey="gatekeeper.tip" components={{ b: <b /> }} />
              </p>
            </Reveal>
          </div>
        </section>
      )}

      <section className="section section--tint" aria-labelledby="after-title">
        <div className="container">
          <SectionHeading eyebrow={t('afterInstall.eyebrow')} id="after-title" title={t('afterInstall.title')} />
          <div className="extras-grid extras-grid--3">
            <Reveal className="extra">
              <ShieldCheck size={20} aria-hidden="true" />
              <h3>{t('afterInstall.permissions.title')}</h3>
              <p>
                {t('afterInstall.permissions.body')} <Link to="/faq#permissions">{t('afterInstall.permissions.link')}</Link>
              </p>
            </Reveal>
            <Reveal className="extra" delay={60}>
              <RefreshCw size={20} aria-hidden="true" />
              <h3>{t('afterInstall.updates.title')}</h3>
              <p>
                <Trans t={t} i18nKey="afterInstall.updates.body" components={{ b: <b /> }} />
              </p>
            </Reveal>
            <Reveal className="extra" delay={120}>
              <Info size={20} aria-hidden="true" />
              <h3>{t('afterInstall.uninstalling.title')}</h3>
              <p>
                {t('afterInstall.uninstalling.body')} <Link to="/faq#uninstall">{t('afterInstall.uninstalling.link')}</Link>
              </p>
            </Reveal>
          </div>
          <p className="center-link">
            {t('afterInstall.stuck')} <Link to="/support" className="text-link">{t('afterInstall.contactSupport')}</Link>
          </p>
        </div>
      </section>
    </div>
  )
}
