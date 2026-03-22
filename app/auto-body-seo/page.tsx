import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicPoweredByFooter } from '@/components/public-powered-by-footer';

export const metadata: Metadata = {
  title: 'Auto Body SEO | Local SEO for Collision and Auto Body Shops',
  description:
    'Learn what actually matters in auto body SEO: local intent, estimate flow, trust proof, reviews, maps, and the service pages that help collision shops win more visibility.',
  alternates: {
    canonical: 'https://shopseoscan.com/auto-body-seo'
  }
};

const sections = [
  {
    title: 'Auto body SEO starts with money pages',
    body:
      'Collision shops rarely win from generic content alone. The strongest gains usually come from local service pages, specialty pages, estimate visibility, and trust proof.'
  },
  {
    title: 'Maps, reviews, and trust matter more than people admit',
    body:
      'Body shops compete in a high-trust category. Reviews, directions, local profile strength, and visible proof often influence both rankings and conversion.'
  },
  {
    title: 'Why a free scan helps',
    body:
      'A scan can quickly show whether the site is missing core service coverage, local trust signals, or estimate-flow mechanics before you spend money blindly.'
  }
];

export default function AutoBodySeoPage() {
  return (
    <main className="diagnostic-page relative overflow-hidden py-16 md:py-20" data-vertical="collision">
      <div className="diagnostic-bg-rings" />

      <section className="container-shell relative z-10">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur md:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300/90">Auto Body SEO</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-slate-100 md:text-6xl">
              Auto body SEO for collision shops that want more local visibility.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300">
              Shop SEO Scan was built to help collision and auto body shops understand what is holding back rankings,
              maps visibility, trust, and estimate demand without burying owners in generic SEO software.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {sections.map((section) => (
                <article key={section.title} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <h2 className="text-lg font-semibold text-slate-100">{section.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{section.body}</p>
                </article>
              ))}
            </div>

            <div className="mt-10 rounded-2xl border border-white/10 bg-black/20 p-6">
              <h2 className="text-xl font-semibold text-slate-100">Next step</h2>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                If you want the practical version of this, start with the free collision SEO scan and we&apos;ll show
                you the ranking leaks, competitor pressure, and fixes that matter first.
              </p>
              <div className="mt-5 space-y-2 text-sm">
                <Link href="/free-collision-seo-scan" className="block font-semibold text-amber-300 underline">
                  Run the free collision SEO scan
                </Link>
                <Link href="/free-auto-body-seo-tool" className="block font-semibold text-amber-300 underline">
                  Open the free auto body SEO tool page
                </Link>
                <Link href="/collision-seo" className="block font-semibold text-amber-300 underline">
                  Read the collision SEO overview
                </Link>
              </div>
            </div>

            <PublicPoweredByFooter className="mt-10" />
          </div>
        </div>
      </section>
    </main>
  );
}
