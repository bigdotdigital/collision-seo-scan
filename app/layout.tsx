import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Collision SEO Scan',
  description: 'Instant local SEO scan for collision repair shops.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
