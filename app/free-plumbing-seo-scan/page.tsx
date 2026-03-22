import type { Metadata } from 'next';
import { VerticalSeoLandingPage } from '@/components/vertical-seo-landing-page';

export const metadata: Metadata = {
  title: 'Free Plumbing SEO Scan | Free Plumbing SEO Tool',
  description:
    'Run a free plumbing SEO scan to find local ranking gaps, emergency-call friction, trust issues, and competitor pressure with a tool built for plumbing companies.',
  alternates: { canonical: 'https://shopseoscan.com/free-plumbing-seo-scan' }
};

export default function FreePlumbingSeoScanPage() {
  return (
    <VerticalSeoLandingPage
      vertical="plumbing"
      mode="free-scan"
      title="Free Plumbing SEO Scan | Free Plumbing SEO Tool"
      description="Run a free plumbing SEO scan to find local ranking gaps, emergency-call friction, trust issues, and competitor pressure."
      path="/free-plumbing-seo-scan"
      eyebrow="Free Plumbing SEO Scan"
      heroTitle="Free plumbing SEO scan for local plumbing companies."
      heroBody="Use a free plumbing SEO tool built for emergency-service, specialty pages, local trust, and booked plumbing work."
    />
  );
}
