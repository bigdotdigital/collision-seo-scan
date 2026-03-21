import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://shopseoscan.com'),
  title: 'Shop SEO Scan | Free SEO Scanner for Collision Repair Shops',
  description:
    'Run a free Shop SEO Scan to find website leaks, local ranking gaps, competitor pressure, and the fixes most likely to increase estimate requests.',
  openGraph: {
    title: 'Shop SEO Scan | Free SEO Scanner for Collision Repair Shops',
    description:
      'Run a free Shop SEO Scan to find website leaks, local ranking gaps, competitor pressure, and the fixes most likely to increase estimate requests.',
    url: 'https://shopseoscan.com',
    siteName: 'Shop SEO Scan',
    type: 'website'
  },
  twitter: {
    card: 'summary',
    title: 'Shop SEO Scan | Free SEO Scanner for Collision Repair Shops',
    description:
      'Run a free Shop SEO Scan to find website leaks, local ranking gaps, competitor pressure, and the fixes most likely to increase estimate requests.'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
