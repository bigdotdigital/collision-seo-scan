import type { Metadata } from 'next';
import { VerticalLandingPage } from '@/components/vertical-landing-page';

export const metadata: Metadata = {
  title: 'Roofing SEO Scan | Free Local SEO Scanner for Roofers',
  description:
    'Run a free roofing SEO scan to uncover local ranking gaps, website leaks, competitor pressure, and the highest-impact fixes for more inspection requests and storm leads.',
  alternates: {
    canonical: 'https://shopseoscan.com/roofing'
  }
};

export default function RoofingPage() {
  return <VerticalLandingPage vertical="roofing" />;
}
