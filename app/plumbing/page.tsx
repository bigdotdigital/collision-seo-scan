import type { Metadata } from 'next';
import { VerticalLandingPage } from '@/components/vertical-landing-page';

export const metadata: Metadata = {
  title: 'Plumbing SEO Scan | Free Local SEO Scanner for Plumbers',
  description:
    'Run a free plumbing SEO scan to uncover local ranking gaps, website leaks, competitor pressure, and the highest-impact fixes for booked plumbing jobs.',
  alternates: {
    canonical: 'https://shopseoscan.com/plumbing'
  }
};

export default function PlumbingPage() {
  return <VerticalLandingPage vertical="plumbing" />;
}
