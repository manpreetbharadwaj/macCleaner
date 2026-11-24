import { useTranslation } from 'react-i18next'
import { Bell, CloudOff, FileLock2, FolderOpen, HardDrive, MousePointerClick, UserX, Wand2 } from 'lucide-react'
import { Link } from '@/components/router'
import { Reveal } from '@/components/Reveal'

const POINT_ICONS = [HardDrive, CloudOff, UserX, FileLock2]
const PERMISSION_ICONS = [FolderOpen, Wand2, HardDrive, Bell]

export function PrivacySection({ showPermissions = true }: { showPermissions?: boolean }) {
  const { t } = useTranslation('home')
  const points = t('privacyBand.points', { returnObjects: true }) as { title: string; body: string }[]
  const permissions = t('privacyBand.permissions', { returnObjects: true }) as { title: string; body: string }[]

  return (
    <section className="privacy-band" aria-labelledby="privacy-title">
      <div className="container">
        <Reveal className="section-heading is-light">
          <p className="eyebrow">{t('privacyBand.eyebrow')}</p>
          <h2 id="privacy-title" className="display-2">
            {t('privacyBand.title')}
          </h2>
          <p className="lead">{t('privacyBand.lead')}</p>
        </Reveal>
        <div className="privacy-grid">
          {points.map((p, i) => {
            const Icon = POINT_ICONS[i]
            return (
              <Reveal key={p.title} className="glass-card" delay={i * 70}>
                <span className="glass-card__icon" aria-hidden="true">
                  <Icon size={20} />
                </span>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </Reveal>
            )
          })}
        </div>

        {showPermissions && (
          <Reveal className="perm-panel" delay={60}>
            <div className="perm-panel__head">
              <MousePointerClick size={18} aria-hidden="true" />
              <h3>{t('privacyBand.permissionsHeading')}</h3>
            </div>
            <ul>
              {permissions.map((p, i) => {
                const Icon = PERMISSION_ICONS[i]
                return (
                  <li key={p.title}>
                    <Icon size={18} aria-hidden="true" />
                    <div>
                      <b>{p.title}</b>
                      <p>{p.body}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
            <p className="perm-panel__foot">
              {t('privacyBand.footNote')} <Link to="/privacy">{t('privacyBand.readPolicy')}</Link>
            </p>
          </Reveal>
        )}
      </div>
    </section>
  )
}
