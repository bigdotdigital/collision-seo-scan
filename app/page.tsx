import type { Metadata } from 'next';
import { VerticalLandingPage } from '@/components/vertical-landing-page';

export const metadata: Metadata = {
  title: 'Shop SEO Scan | Free Local SEO Scanner for Collision Shops',
  description:
    'Scan your collision repair website and get a fast report on SEO leaks, local ranking gaps, competitor pressure, and the fixes most likely to increase estimate requests.',
  alternates: {
    canonical: 'https://shopseoscan.com/'
  }
};

export default function HomePage() {
  return <VerticalLandingPage vertical="collision" />;
}
