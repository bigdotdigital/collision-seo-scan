import type { Metadata } from 'next';
import { VerticalSeoLandingPage } from '@/components/vertical-seo-landing-page';

export const metadata: Metadata = {
  title: 'HVAC SEO | Local SEO for HVAC Companies',
  description:
    'HVAC SEO for companies that want stronger local visibility, better trust signals, and more booked service calls. Run a free HVAC SEO scan built for real service businesses.',
  alternates: { canonical: 'https://shopseoscan.com/hvac-seo' }
};

export default function HvacSeoPage() {
  return (
    <VerticalSeoLandingPage
      vertical="hvac"
      mode="seo"
      title="HVAC SEO | Local SEO for HVAC Companies"
      description="HVAC SEO for companies that want stronger local visibility, better trust signals, and more booked service calls."
      path="/hvac-seo"
      eyebrow="HVAC SEO"
      heroTitle="HVAC SEO for companies that want more booked service calls."
      heroBody="Run a free HVAC SEO scan to understand what is holding back local rankings, emergency-service visibility, trust, and booked call volume."
    />
  );
}
