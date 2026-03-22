import type { Metadata } from 'next';
import { VerticalSeoLandingPage } from '@/components/vertical-seo-landing-page';

export const metadata: Metadata = {
  title: 'Plumbing SEO | Local SEO for Plumbing Companies',
  description:
    'Plumbing SEO for companies that want stronger local visibility, better emergency-call trust, and more booked jobs. Run a free plumbing SEO scan built for local plumbers.',
  alternates: { canonical: 'https://shopseoscan.com/plumbing-seo' }
};

export default function PlumbingSeoPage() {
  return (
    <VerticalSeoLandingPage
      vertical="plumbing"
      mode="seo"
      title="Plumbing SEO | Local SEO for Plumbing Companies"
      description="Plumbing SEO for companies that want stronger local visibility, better emergency-call trust, and more booked jobs."
      path="/plumbing-seo"
      eyebrow="Plumbing SEO"
      heroTitle="Plumbing SEO for companies that want more booked jobs."
      heroBody="Run a free plumbing SEO scan to see what is holding back local rankings, emergency-call readiness, trust, and booked plumbing work."
    />
  );
}
