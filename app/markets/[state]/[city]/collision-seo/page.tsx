import Link from 'next/link';
import { PublicSeoSchema } from '@/components/public-seo-schema';
import { getCollisionCityMarketCopy } from '@/lib/city-market-copy';

export default function CityCollisionSeoPage({ params }: { params: { state: string; city: string } }) {
  const cityLabel = decodeURIComponent(params.city).replace(/-/g, ' ');
  const stateLabel = decodeURIComponent(params.state).toUpperCase();
  const path = `/markets/${params.state}/${params.city}/collision-seo`;
  const copy = getCollisionCityMarketCopy(params.city);
  const faq = [
    ...copy.faq,
    {
      question: `Can I run a free collision SEO scan for a shop in ${cityLabel}?`,
      answer: `Yes. Start with the free collision scan to see what is suppressing rankings, trust, and estimate demand for a shop in ${cityLabel}, ${stateLabel}.`
    }
  ];
  return (
    <main className="diagnostic-page relative overflow-hidden py-16 md:py-20" data-vertical="collision">
      <PublicSeoSchema
        title={`Collision SEO in ${cityLabel}, ${stateLabel} | Shop SEO Scan`}
        description={`Run a collision SEO scan for a body shop in ${cityLabel}, ${stateLabel}. See local ranking gaps, trust leaks, and the next fixes most likely to improve estimate demand.`}
        path={path}
        faq={faq}
      />
      <div className="diagnostic-bg-rings" />
      <section className="container-shell relative z-10">
        <div className="mx-auto max-w-5xl rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300/90">
            {cityLabel}, {stateLabel} Collision SEO
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-slate-100 md:text-6xl">
            Collision SEO in {cityLabel}, {stateLabel}
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300">
            Run a free collision SEO scan for a body shop in {cityLabel} and see what is holding back local rankings, trust,
            and estimate conversion in this market.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h2 className="text-lg font-semibold text-slate-100">{copy.headline}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">{copy.summary}</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h2 className="text-lg font-semibold text-slate-100">Why it matters here</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">{copy.whyItMatters}</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h2 className="text-lg font-semibold text-slate-100">Priority areas</h2>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
                {copy.priorityAreas.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </article>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/collision" className="rounded-md bg-amber-300 px-4 py-2 font-semibold text-black">
              Start Scan
            </Link>
            <Link href="/free-collision-seo-scan" className="rounded-md bg-slate-900 px-4 py-2 font-semibold text-white">
              Free Collision SEO Scan
            </Link>
            <Link href="/collision-seo" className="rounded-md bg-slate-900 px-4 py-2 font-semibold text-white">
              Collision SEO Overview
            </Link>
          </div>

          <div className="mt-10 grid gap-4">
            {faq.map((item) => (
              <article key={item.question} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <h2 className="text-lg font-semibold text-slate-100">{item.question}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-300">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
