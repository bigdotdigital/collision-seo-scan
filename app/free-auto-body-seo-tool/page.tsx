import type { Metadata } from 'next';
import Link from 'next/link';
import { ScanForm } from '@/components/scan-form';
import { PublicPoweredByFooter } from '@/components/public-powered-by-footer';

export const metadata: Metadata = {
  title: 'Free Auto Body SEO Tool | Free Collision SEO Scan',
  description:
    'Use a free auto body SEO tool built for collision repair shops. Get a scan of local ranking gaps, estimate-path friction, trust issues, and nearby competitor pressure.',
  alternates: {
    canonical: 'https://shopseoscan.com/free-auto-body-seo-tool'
  }
};

export default function FreeAutoBodySeoToolPage() {
  return (
    <main className="diagnostic-page relative overflow-hidden py-16 md:py-20" data-vertical="collision">
      <div className="diagnostic-bg-rings" />

      <section className="container-shell relative z-10">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur md:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300/90">Free Auto Body SEO Tool</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-slate-100 md:text-6xl">
              Free auto body SEO tool for collision repair shops.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300">
              Scan your collision shop website and get a practical read on rankings, trust gaps, estimate friction,
              local visibility, and competitor pressure. No generic SEO fluff.
            </p>

            <div className="mt-10 grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
                <h2 className="text-xl font-semibold text-slate-100">Run the tool</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Enter your shop details and get a real collision SEO report with priorities and next moves.
                </p>
                <div className="mt-6">
                  <ScanForm vertical="collision" />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/90">Best fit for</p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
                  <li>Auto body shops that want better local rankings</li>
                  <li>Collision shops trying to improve estimate flow</li>
                  <li>Owners comparing nearby competitors</li>
                  <li>Marketers who need a collision-specific starting point</li>
                </ul>
                <div className="mt-6 space-y-2 text-sm">
                  <Link href="/collision-seo" className="block font-semibold text-amber-300 underline">
                    Collision SEO page
                  </Link>
                  <Link href="/free-collision-seo-scan" className="block font-semibold text-amber-300 underline">
                    Free collision SEO scan
                  </Link>
                </div>
              </div>
            </div>

            <PublicPoweredByFooter className="mt-10" />
          </div>
        </div>
      </section>
    </main>
  );
}
