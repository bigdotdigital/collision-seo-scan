import type { Metadata } from 'next';
import { VerticalSeoLandingPage } from '@/components/vertical-seo-landing-page';

export const metadata: Metadata = {
  title: 'Free Roofing SEO Scan | Free Roofing SEO Tool',
  description:
    'Run a free roofing SEO scan to find local ranking gaps, inspection friction, trust leaks, and competitor pressure with a tool built for roofing contractors.',
  alternates: { canonical: 'https://shopseoscan.com/free-roofing-seo-scan' }
};

export default function FreeRoofingSeoScanPage() {
  return (
    <VerticalSeoLandingPage
      vertical="roofing"
      mode="free-scan"
      title="Free Roofing SEO Scan | Free Roofing SEO Tool"
      description="Run a free roofing SEO scan to find local ranking gaps, inspection friction, trust leaks, and competitor pressure."
      path="/free-roofing-seo-scan"
      eyebrow="Free Roofing SEO Scan"
      heroTitle="Free roofing SEO scan for roofing contractors."
      heroBody="Use a free roofing SEO tool built around inspections, storm response, trust proof, and the pages that actually drive roofing demand."
    />
  );
}
