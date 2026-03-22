import type { Metadata } from 'next';
import Link from 'next/link';
import { ScanForm } from '@/components/scan-form';
import { PublicPoweredByFooter } from '@/components/public-powered-by-footer';

export const metadata: Metadata = {
  title: 'Free Collision SEO Scan | Free Auto Body SEO Tool',
  description:
    'Run a free collision SEO scan for your auto body shop. Find local ranking leaks, estimate-path issues, trust gaps, and competitor pressure with a free auto body SEO tool built for collision repair.',
  alternates: {
    canonical: 'https://shopseoscan.com/free-collision-seo-scan'
  }
};

const faq = [
  {
    q: 'What is a free collision SEO scan?',
    a: 'It is a fast website and local SEO review for an auto body or collision repair shop. The goal is to show where visibility is leaking, what nearby competitors are doing better, and what should be fixed first.'
  },
  {
    q: 'Is this really built for auto body shops?',
    a: 'Yes. The scanner and report were built around collision-shop realities like estimate visibility, trust proof, reviews, local search, OEM and specialty signals, and the pages that drive estimate demand.'
  },
  {
    q: 'Why use this instead of a generic SEO tool?',
    a: 'Generic tools usually give broad scores. This one is built to tell a collision shop owner what is costing estimate opportunities and what to do next.'
  }
];

export default function FreeCollisionSeoScanPage() {
  return (
    <main className="diagnostic-page relative overflow-hidden py-16 md:py-20" data-vertical="collision">
      <div className="diagnostic-bg-rings" />

      <section className="container-shell relative z-10">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur md:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300/90">Free Collision SEO Scan</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-slate-100 md:text-6xl">
              Free auto body SEO tool for collision repair shops.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300">
              Run a free collision SEO scan to uncover local ranking gaps, website leaks, estimate-path issues, and competitor pressure.
              This is built for body shops that want more estimate opportunities, not generic SEO dashboards.
            </p>

            <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Free collision SEO scan</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Free auto body SEO tool</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Competitor + estimate-path analysis</span>
            </div>

            <div className="mt-10 grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
                <h2 className="text-xl font-semibold text-slate-100">Run your free collision SEO scan</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Enter your shop details and get a report built around local visibility, trust gaps, and estimate-growth opportunities.
                </p>
                <div className="mt-6">
                  <ScanForm vertical="collision" />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/90">What it looks for</p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
                  <li>Estimate CTA visibility and friction</li>
                  <li>Map and review trust gaps</li>
                  <li>Service-page and specialty-content coverage</li>
                  <li>Local competitor pressure and missed opportunities</li>
                </ul>
                <div className="mt-6 space-y-2 text-sm">
                  <Link href="/collision" className="block font-semibold text-amber-300 underline">
                    Main collision scanner
                  </Link>
                  <Link href="/demo?vertical=collision" className="block font-semibold text-amber-300 underline">
                    See collision example report
                  </Link>
                  <Link href="/free-seo-scan" className="block font-semibold text-amber-300 underline">
                    Need the generic free SEO scan page?
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-10 grid gap-4">
              {faq.map((item) => (
                <article key={item.q} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <h2 className="text-lg font-semibold text-slate-100">{item.q}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{item.a}</p>
                </article>
              ))}
            </div>

            <PublicPoweredByFooter className="mt-10" />
          </div>
        </div>
      </section>
    </main>
  );
}
