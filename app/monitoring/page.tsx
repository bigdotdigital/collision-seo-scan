import type { Metadata } from 'next';
import Link from 'next/link';
import { MonitoringTrialForm } from '@/components/monitoring-trial-form';

export const metadata: Metadata = {
  title: 'Monitoring Dashboard | Shop SEO Scan',
  description:
    'Start the Shop SEO Scan monitoring dashboard and track weekly rankings, competitor movement, visibility gaps, and ongoing SEO progress.',
  alternates: {
    canonical: 'https://shopseoscan.com/monitoring'
  }
};

type Query = {
  scanId?: string;
  orgId?: string;
  email?: string;
  shop?: string;
  city?: string;
};

export default function MonitoringLandingPage({
  searchParams
}: {
  searchParams?: Query;
}) {
  const scanId = searchParams?.scanId || '';
  const orgId = searchParams?.orgId || '';
  const email = searchParams?.email || '';
  const shop = searchParams?.shop || 'Your Shop';
  const city = searchParams?.city || 'your market';

  const calendlyUrl = process.env.CALENDLY_LINK || 'https://calendly.com/bigdotdigital/30min';
  const supportEmail = process.env.REPLY_TO_EMAIL || 'bigdotdigital@gmail.com';

  return (
    <main className="monitor-page">
      <section className="monitor-container">
        <div className="monitor-layout">
          <div className="monitor-left-col">
            <header className="monitor-header">
              <span className="monitor-logo-dot" />
              <span className="monitor-logo-text">Big Dot Monitoring</span>
            </header>

            <div className="monitor-inline-links">
              <Link href="/pricing">See pricing</Link>
              <Link href="/login">Login</Link>
            </div>

            <section>
              <h1 className="monitor-h1">Launch your SEO monitoring dashboard in minutes</h1>
              <p className="monitor-copy">
                {shop} in {city}. No Zoom required. Start on your own, then email us for dashboard
                customizations or feedback.
              </p>
              <p className="monitor-copy" style={{ marginTop: '8px' }}>
                Includes 3 free reports per month. Start a 30-day trial now, then continue at $49/month.
              </p>
            </section>

            <section className="monitor-card-lime">
              <div>
                <span className="monitor-pill-tag">30-day free trial</span>
                <p className="monitor-price-large">
                  $49<span className="monitor-price-sub">/mo</span>
                </p>
              </div>
              <span className="monitor-plus-badge" aria-hidden>
                +
              </span>
            </section>

            <section className="monitor-card">
              <h2 className="monitor-h2">Everything included</h2>
              <article className="monitor-list-item">
                <span className="monitor-icon-box">↗</span>
                <div>
                  <p className="monitor-item-title">Rankings and movement</p>
                  <p className="monitor-item-sub">Weekly updates</p>
                </div>
              </article>
              <article className="monitor-list-item">
                <span className="monitor-icon-box">✓</span>
                <div>
                  <p className="monitor-item-title">Competitor watch</p>
                  <p className="monitor-item-sub">See who outranks you and what changed</p>
                </div>
              </article>
              <article className="monitor-list-item">
                <span className="monitor-icon-box">◎</span>
                <div>
                  <p className="monitor-item-title">Website monitoring</p>
                  <p className="monitor-item-sub">Alerts for SEO, speed, and conversion changes</p>
                </div>
              </article>
            </section>
          </div>

          <div className="monitor-right-col">
            <MonitoringTrialForm
              scanId={scanId || undefined}
              orgId={orgId || undefined}
              defaultEmail={email || undefined}
              defaultName={shop !== 'Your Shop' ? shop : undefined}
              calendlyUrl={calendlyUrl}
              supportEmail={supportEmail}
            />

            <p className="monitor-support-line">
              Free setup call + monthly SEO consults included if you want hands-on help.
            </p>

            <p className="monitor-bottom-link">
              Already have an account?{' '}
              <Link href="/login">
                <strong>Login to dashboard</strong>
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
