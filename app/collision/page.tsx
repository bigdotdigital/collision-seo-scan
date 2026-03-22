import type { Metadata } from 'next';
import { VerticalLandingPage } from '@/components/vertical-landing-page';

export const metadata: Metadata = {
  title: 'Collision Repair SEO Scan | Collision SEO | Free Local SEO Scanner',
  description:
    'Run a free collision repair SEO scan to uncover local ranking gaps, website leaks, competitor pressure, and the highest-impact fixes for estimate growth. Built for collision SEO and auto body SEO.',
  alternates: {
    canonical: 'https://shopseoscan.com/collision'
  }
};

export default function CollisionPage() {
  return <VerticalLandingPage vertical="collision" />;
}
