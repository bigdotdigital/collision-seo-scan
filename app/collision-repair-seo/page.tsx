import type { Metadata } from 'next';
import Link from 'next/link';
import { ScanForm } from '@/components/scan-form';
import { PublicPoweredByFooter } from '@/components/public-powered-by-footer';
import { PublicSeoSchema } from '@/components/public-seo-schema';

export const metadata: Metadata = {
  title: 'Collision Repair SEO | SEO for Collision Repair Shops',
  description:
    'Collision repair SEO for body shops that want more local visibility, stronger trust signals, and better estimate flow. Run a free scan built for collision repair shops.',
  alternates: {
    canonical: 'https://shopseoscan.com/collision-repair-seo'
  }
};

const faq = [
  {
    question: 'What is collision repair SEO?',
    answer:
      'Collision repair SEO is the work of improving how a body shop appears in local search, maps, and service-intent searches so more nearby drivers find the shop and request estimates.'
  },
  {
    question: 'What matters most in collision repair SEO?',
    answer:
      'The biggest levers are usually estimate visibility, maps and review trust, service-page coverage, local relevance, and specialty proof like hail, insurance help, or certifications.'
  },
  {
    question: 'Why use Shop SEO Scan for collision repair SEO?',
    answer:
      'Shop SEO Scan is built around collision-shop realities instead of generic SEO software. It focuses on estimate demand, trust signals, competitor pressure, and the fixes that matter first.'
  }
];

export default function CollisionRepairSeoPage() {
  return (
    <main className="diagnostic-page relative overflow-hidden py-16 md:py-20" data-vertical="collision">
      <PublicSeoSchema
        title="Collision Repair SEO | SEO for Collision Repair Shops"
        description="Collision repair SEO for body shops that want more local visibility, stronger trust signals, and better estimate flow."
        path="/collision-repair-seo"
        faq={faq}
      />
      <div className="diagnostic-bg-rings" />

      <section className="container-shell relative z-10">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur md:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300/90">Collision Repair SEO</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-slate-100 md:text-6xl">
              Collision repair SEO for shops that want more local estimate demand.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300">
              If you want to understand what is holding your body shop back in local search, maps, trust, and estimate conversion,
              start with a free scan built specifically for collision repair shops.
            </p>

            <div className="mt-10 grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
                <h2 className="text-xl font-semibold text-slate-100">Run your free scan</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Get a practical collision repair SEO report with local visibility gaps, trust issues, competitor pressure, and next steps.
                </p>
                <div className="mt-6">
                  <ScanForm vertical="collision" />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/90">Related pages</p>
                <div className="mt-4 space-y-3 text-sm">
                  <Link href="/collision-seo" className="block font-semibold text-amber-300 underline">
                    Collision SEO
                  </Link>
                  <Link href="/free-collision-seo-scan" className="block font-semibold text-amber-300 underline">
                    Free collision SEO scan
                  </Link>
                  <Link href="/free-auto-body-seo-tool" className="block font-semibold text-amber-300 underline">
                    Free auto body SEO tool
                  </Link>
                </div>
              </div>
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
