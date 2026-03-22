import type { Metadata } from 'next';
import { VerticalLandingPage } from '@/components/vertical-landing-page';

export const metadata: Metadata = {
  title: 'HVAC SEO Scan | Free Local SEO Scanner for HVAC Companies',
  description:
    'Run a free HVAC SEO scan to uncover local ranking gaps, website leaks, competitor pressure, and the highest-impact fixes for booked service calls.',
  alternates: {
    canonical: 'https://shopseoscan.com/hvac'
  }
};

export default function HvacPage() {
  return <VerticalLandingPage vertical="hvac" />;
}
