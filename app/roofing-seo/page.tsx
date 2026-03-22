import type { Metadata } from 'next';
import { VerticalSeoLandingPage } from '@/components/vertical-seo-landing-page';

export const metadata: Metadata = {
  title: 'Roofing SEO | Local SEO for Roofing Contractors',
  description:
    'Roofing SEO for contractors that want stronger local visibility, better inspection demand, and more storm-driven leads. Run a free roofing SEO scan built for roofers.',
  alternates: { canonical: 'https://shopseoscan.com/roofing-seo' }
};

export default function RoofingSeoPage() {
  return (
    <VerticalSeoLandingPage
      vertical="roofing"
      mode="seo"
      title="Roofing SEO | Local SEO for Roofing Contractors"
      description="Roofing SEO for contractors that want stronger local visibility, better inspection demand, and more storm-driven leads."
      path="/roofing-seo"
      eyebrow="Roofing SEO"
      heroTitle="Roofing SEO for contractors that want more inspections and storm leads."
      heroBody="Run a free roofing SEO scan to see what is holding back local rankings, inspection conversion, trust, and storm-demand capture."
    />
  );
}
