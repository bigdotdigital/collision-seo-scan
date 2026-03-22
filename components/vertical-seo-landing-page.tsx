import Link from 'next/link';
import { ScanForm } from '@/components/scan-form';
import { PublicPoweredByFooter } from '@/components/public-powered-by-footer';
import { PublicSeoSchema } from '@/components/public-seo-schema';
import { getVerticalConfig, type VerticalSlug } from '@/lib/verticals';

type LandingMode = 'seo' | 'free-scan';

function seoFaq(vertical: VerticalSlug) {
  const cfg = getVerticalConfig(vertical);
  return [
    {
      question: `What is ${cfg.label} SEO?`,
      answer: `${cfg.label} SEO is the work of improving how your business ranks and converts in local search, maps, and service-intent searches so more nearby customers choose you.`
    },
    {
      question: `What matters most in ${cfg.label} SEO?`,
      answer: `The biggest levers are usually local relevance, service-page coverage, trust proof, review visibility, strong ${cfg.primaryCtaLabel.toLowerCase()} flow, and clear specialty differentiation.`
    },
    {
      question: `Can I run a free ${cfg.label.toLowerCase()} SEO scan first?`,
      answer: `Yes. Start with the free scan to see what is suppressing visibility, trust, and ${cfg.conversionGoalLabel} before deciding whether to DIY, monitor, or hire help.`
    }
  ];
}

export function VerticalSeoLandingPage({
  vertical,
  mode,
  title,
  description,
  path,
  eyebrow,
  heroTitle,
  heroBody
}: {
  vertical: VerticalSlug;
  mode: LandingMode;
  title: string;
  description: string;
  path: string;
  eyebrow: string;
  heroTitle: string;
  heroBody: string;
}) {
  const cfg = getVerticalConfig(vertical);
  const faq = seoFaq(vertical);
  const relatedPages =
    mode === 'seo'
      ? [
          { href: `/${vertical}`, label: `${cfg.label} scanner` },
          { href: `/free-${vertical}-seo-scan`, label: `Free ${cfg.label} SEO scan` }
        ]
      : [
          { href: `/${vertical}-seo`, label: `${cfg.label} SEO page` },
          { href: `/${vertical}`, label: `${cfg.label} scanner` }
        ];

  return (
    <main className="diagnostic-page relative overflow-hidden py-16 md:py-20" data-vertical={cfg.slug}>
      <PublicSeoSchema title={title} description={description} path={path} faq={faq} />
      <div className="diagnostic-bg-rings" />

      <section className="container-shell relative z-10">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur md:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300/90">{eyebrow}</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-slate-100 md:text-6xl">
              {heroTitle}
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300">{heroBody}</p>

            <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">{cfg.label} SEO</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                {mode === 'free-scan' ? `Free ${cfg.label} SEO scan` : `${cfg.label} local SEO`}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                {cfg.primaryCtaLabel} + trust analysis
              </span>
            </div>

            <div className="mt-10 grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
                <h2 className="text-xl font-semibold text-slate-100">
                  {mode === 'free-scan' ? `Run your free ${cfg.label.toLowerCase()} SEO scan` : `Run your ${cfg.label.toLowerCase()} SEO scan`}
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  Get a practical report on local visibility, trust gaps, competitor pressure, and the next fixes most likely to improve {cfg.conversionGoalLabel}.
                </p>
                <div className="mt-6">
                  <ScanForm vertical={vertical} />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/90">Related pages</p>
                <div className="mt-4 space-y-3 text-sm">
                  {relatedPages.map((item) => (
                    <Link key={item.href} href={item.href} className="block font-semibold text-amber-300 underline">
                      {item.label}
                    </Link>
                  ))}
                  <Link href="/free-seo-scan" className="block font-semibold text-amber-300 underline">
                    Generic free SEO scan
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
