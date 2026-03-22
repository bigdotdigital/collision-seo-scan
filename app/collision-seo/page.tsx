import type { Metadata } from 'next';
import Link from 'next/link';
import { ScanForm } from '@/components/scan-form';
import { PublicPoweredByFooter } from '@/components/public-powered-by-footer';
import { PublicSeoSchema } from '@/components/public-seo-schema';

export const metadata: Metadata = {
  title: 'Collision SEO | SEO for Collision Repair and Auto Body Shops',
  description:
    'Shop SEO Scan helps collision repair shops understand what is holding back rankings, maps visibility, trust, and estimate flow. Run a free collision SEO scan built for auto body shops.',
  alternates: {
    canonical: 'https://shopseoscan.com/collision-seo'
  }
};

const sections = [
  {
    title: 'What collision SEO should actually improve',
    body:
      'Real collision SEO is not generic blog volume. It should improve estimate flow, map visibility, trust proof, review strength, and the service pages that drive profitable local searches.'
  },
  {
    title: 'Built around how body shops actually win',
    body:
      'The report is shaped around local body-shop realities like estimates, insurance help, hail pages, review proof, certifications, specialty repair coverage, and what nearby shops are doing better.'
  },
  {
    title: 'Better than a generic SEO grade',
    body:
      'Instead of broad software noise, this gives collision shops a practical reading on local pressure, site leaks, and the next fixes most likely to improve visibility and estimate demand.'
  }
];

const faq = [
  {
    question: 'What is collision SEO?',
    answer:
      'Collision SEO is the work of improving how a body shop ranks and converts in local search, maps, and service-intent searches so more nearby drivers request estimates.'
  },
  {
    question: 'What makes collision SEO different from generic SEO?',
    answer:
      'Collision SEO needs to account for estimate flow, maps trust, reviews, specialty repair coverage, insurance help, and local competitor pressure instead of just generic content volume.'
  },
  {
    question: 'Can I run a free collision SEO scan first?',
    answer:
      'Yes. Start with the free collision SEO scan to see what is suppressing visibility, trust, and estimate conversion before deciding whether to DIY, monitor, or hire help.'
  }
];

export default function CollisionSeoPage() {
  return (
    <main className="diagnostic-page relative overflow-hidden py-16 md:py-20" data-vertical="collision">
      <PublicSeoSchema
        title="Collision SEO | SEO for Collision Repair and Auto Body Shops"
        description="Shop SEO Scan helps collision repair shops understand what is holding back rankings, maps visibility, trust, and estimate flow. Run a free collision SEO scan built for auto body shops."
        path="/collision-seo"
        faq={faq}
      />
      <div className="diagnostic-bg-rings" />

      <section className="container-shell relative z-10">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur md:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300/90">Collision SEO</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-slate-100 md:text-6xl">
              Collision SEO built for auto body shops that want more estimate demand.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300">
              Run a free collision SEO scan and see what is suppressing rankings, maps visibility, trust, and estimate conversion.
              Built for collision repair shops, not generic SEO dashboards.
            </p>

            <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Collision SEO</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Auto body SEO</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Free collision SEO scan</span>
            </div>

            <div className="mt-10 grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
                <h2 className="text-xl font-semibold text-slate-100">Run your collision SEO scan</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Start with your website, city, and shop name. We&apos;ll generate a report built around local competition,
                  estimate visibility, and trust gaps.
                </p>
                <div className="mt-6">
                  <ScanForm vertical="collision" />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/90">Related pages</p>
                <div className="mt-4 space-y-3 text-sm">
                  <Link href="/free-collision-seo-scan" className="block font-semibold text-amber-300 underline">
                    Free collision SEO scan
                  </Link>
                  <Link href="/free-auto-body-seo-tool" className="block font-semibold text-amber-300 underline">
                    Free auto body SEO tool
                  </Link>
                  <Link href="/auto-body-seo" className="block font-semibold text-amber-300 underline">
                    Auto body SEO guide
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {sections.map((section) => (
                <article key={section.title} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <h2 className="text-lg font-semibold text-slate-100">{section.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{section.body}</p>
                </article>
              ))}
            </div>

            <div className="mt-10 grid gap-4">
              {faq.map((item) => (
                <article key={item.question} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <h2 className="text-lg font-semibold text-slate-100">{item.question}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{item.answer}</p>
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
