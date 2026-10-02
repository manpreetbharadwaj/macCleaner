import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <div className="page">
      <section className="page-hero not-found">
        <div className="container">
          <p className="eyebrow">404</p>
          <h1 className="display-1">This page has been cleaned up.</h1>
          <p className="lead">Or it never existed. Either way, there’s nothing here.</p>
          <p className="not-found__actions">
            <Link to="/" className="btn btn--primary btn--lg">
              Go home
            </Link>
            <Link to="/faq" className="btn btn--ghost btn--lg">
              Read the FAQ
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
