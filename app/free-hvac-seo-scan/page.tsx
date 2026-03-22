import type { Metadata } from 'next';
import { VerticalSeoLandingPage } from '@/components/vertical-seo-landing-page';

export const metadata: Metadata = {
  title: 'Free HVAC SEO Scan | Free HVAC SEO Tool',
  description:
    'Run a free HVAC SEO scan to find local ranking gaps, emergency-service visibility issues, trust leaks, and competitor pressure with a tool built for HVAC companies.',
  alternates: { canonical: 'https://shopseoscan.com/free-hvac-seo-scan' }
};

export default function FreeHvacSeoScanPage() {
  return (
    <VerticalSeoLandingPage
      vertical="hvac"
      mode="free-scan"
      title="Free HVAC SEO Scan | Free HVAC SEO Tool"
      description="Run a free HVAC SEO scan to find local ranking gaps, emergency-service visibility issues, trust leaks, and competitor pressure."
      path="/free-hvac-seo-scan"
      eyebrow="Free HVAC SEO Scan"
      heroTitle="Free HVAC SEO scan for heating and cooling companies."
      heroBody="Use a free HVAC SEO tool built for real service companies, not generic SEO dashboards. See what is leaking calls, local visibility, and trust."
    />
  );
}
