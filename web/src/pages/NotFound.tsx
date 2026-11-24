import { useTranslation } from 'react-i18next'
import { Link } from '@/components/router'

export function NotFoundPage() {
  const { t } = useTranslation('notFound')
  return (
    <div className="page">
      <section className="page-hero not-found">
        <div className="container">
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1 className="display-1">{t('title')}</h1>
          <p className="lead">{t('lead')}</p>
          <p className="not-found__actions">
            <Link to="/" className="btn btn--primary btn--lg">
              {t('goHome')}
            </Link>
            <Link to="/faq" className="btn btn--ghost btn--lg">
              {t('readFaq')}
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
