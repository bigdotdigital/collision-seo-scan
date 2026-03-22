import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicPoweredByFooter } from '@/components/public-powered-by-footer';
import { PublicSeoSchema } from '@/components/public-seo-schema';
import { getDenverCollisionRankings } from '@/lib/public-rankings';

export const revalidate = 3600;
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Denver Collision Shop SEO Rankings 2026 | Top Auto Body SEO Shops',
  description:
    'See our 2026 Denver collision shop SEO rankings based on published scan scores, local visibility signals, website strength, and estimate-path performance across the Denver metro collision market.',
  alternates: {
    canonical: 'https://shopseoscan.com/denver-collision-shop-seo-rankings-2026'
  }
};

const faq = [
  {
    question: 'How are these Denver collision SEO rankings calculated?',
    answer:
      'The rankings use our most recent published scan for each Denver metro collision shop. We rank shops by total SEO score, then use review strength and recency as tie-breakers. The underlying scan looks at website quality, local visibility, and service-intent coverage.'
  },
  {
    question: 'Are these rankings just for Denver proper?',
    answer:
      'No. This page uses the broader Denver metro collision market, including Denver, Aurora, Lakewood, Littleton, Englewood, Arvada, Westminster, Thornton, Centennial, and Broomfield.'
  },
  {
    question: 'Can my shop run the same scan?',
    answer:
      'Yes. Any collision or auto body shop can run the same free scan and see how its website, trust signals, and local visibility compare to the market.'
  }
];

function formatDate(value: Date | null) {
  if (!value) return 'recently';
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(value);
}

export default async function DenverCollisionShopSeoRankings2026Page() {
  const data = await getDenverCollisionRankings();
  const topTen = data.rankings.slice(0, 10);

  return (
    <main className="diagnostic-page relative overflow-hidden py-16 md:py-20" data-vertical="collision">
      <PublicSeoSchema
        title="Denver Collision Shop SEO Rankings 2026 | Top Auto Body SEO Shops"
        description="See our 2026 Denver collision shop SEO rankings based on published scan scores, local visibility signals, website strength, and estimate-path performance across the Denver metro collision market."
        path="/denver-collision-shop-seo-rankings-2026"
        faq={faq}
      />
      <div className="diagnostic-bg-rings" />

      <section className="container-shell relative z-10">
        <div className="mx-auto max-w-6xl rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300/90">Denver Collision SEO Rankings</p>
          <h1 className="mt-4 max-w-5xl text-4xl font-semibold tracking-tight text-slate-100 md:text-6xl">
            Top Denver collision shop SEO rankings for 2026.
          </h1>
          <p className="mt-6 max-w-4xl text-base leading-8 text-slate-300">
            This page ranks Denver metro collision and auto body shops using the most recent published Shop SEO Scan results in our dataset.
            We score website strength, local visibility, and service-intent coverage, then break ties with review momentum and scan recency.
          </p>

          <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-300">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Updated {formatDate(data.updatedAt)}</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">{data.totals.shopsAnalyzed} Denver metro shops analyzed</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">{data.totals.shopsWithPublishedScans} shops with published scans</span>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-4">
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/90">Published set</p>
              <p className="mt-3 text-3xl font-semibold text-slate-100">{data.totals.shopsWithPublishedScans}</p>
              <p className="mt-2 text-sm leading-7 text-slate-300">Shops in the current public Denver collision ranking pool.</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/90">Market average</p>
              <p className="mt-3 text-3xl font-semibold text-slate-100">{data.totals.averageScore}</p>
              <p className="mt-2 text-sm leading-7 text-slate-300">Average overall SEO score across the published Denver set.</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/90">Top 10 average</p>
              <p className="mt-3 text-3xl font-semibold text-slate-100">{data.highlights.topTenAverageScore}</p>
              <p className="mt-2 text-sm leading-7 text-slate-300">What the leading Denver shops are averaging right now.</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/90">Estimate flow gap</p>
              <p className="mt-3 text-3xl font-semibold text-slate-100">{data.highlights.topTenEstimateFlowPct}%</p>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Of the top 10 shops have a visible estimate flow, versus {data.highlights.marketEstimateFlowPct}% across the ranked market.
              </p>
            </article>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
            <section className="rounded-2xl border border-white/10 bg-black/20 p-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/90">2026 leaderboard</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-100">Top Denver collision SEO shops</h2>
                </div>
                <p className="text-xs text-slate-400">Sorted by published scan score, then reviews and recency.</p>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
                <div className="grid grid-cols-[72px_minmax(0,1fr)_120px_96px] bg-white/5 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <span>Rank</span>
                  <span>Shop</span>
                  <span>Reviews</span>
                  <span>Score</span>
                </div>
                <div className="divide-y divide-white/10">
                  {topTen.map((row) => (
                    <article key={row.shopId} className="grid grid-cols-[72px_minmax(0,1fr)_120px_96px] gap-3 px-4 py-4 text-sm">
                      <div className="flex items-center">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-300/15 font-semibold text-amber-300">
                          #{topTen.indexOf(row) + 1}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-100">{row.name}</h3>
                        <p className="mt-1 text-slate-400">
                          {row.city} • {row.websiteHost || 'No visible domain'}
                        </p>
                        <p className="mt-2 text-xs text-slate-300">
                          Website {row.scoreWebsite} • Local {row.scoreLocal} • Intent {row.scoreIntent}
                        </p>
                      </div>
                      <div className="flex items-center text-slate-200">{row.reviews}</div>
                      <div className="flex items-center">
                        <span className="rounded-full bg-emerald-400/10 px-3 py-1 font-semibold text-emerald-300">{row.scoreTotal}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <aside className="space-y-4">
              <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/90">What wins here</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-100">Denver leaders stack trust and conversion.</h2>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  The top Denver shops are not winning on one thing. They combine strong local signals, cleaner specialty/service coverage,
                  and more visible trust or estimate paths than the middle of the market.
                </p>
              </article>

              <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/90">OEM density</p>
                <p className="mt-3 text-3xl font-semibold text-slate-100">{data.highlights.topTenOemAvg}</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">
                  Average OEM/certification signals across the top 10 Denver shops in our current scan set.
                </p>
              </article>

              <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/90">Methodology</p>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
                  <li>• Denver metro collision market only</li>
                  <li>• Most recent published scan per shop</li>
                  <li>• Ranked by total SEO score</li>
                  <li>• Review volume and recency break ties</li>
                </ul>
              </article>
            </aside>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h2 className="text-lg font-semibold text-slate-100">Run the same scan</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Want to see where your shop lands versus Denver leaders? Run the same free collision SEO scan we used for this ranking set.
              </p>
              <Link href="/free-collision-seo-scan" className="mt-4 inline-block font-semibold text-amber-300 underline">
                Start free collision SEO scan
              </Link>
            </article>
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h2 className="text-lg font-semibold text-slate-100">See the broader market</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                If you want the market context behind this list, explore the Denver collision SEO market pages and benchmark coverage.
              </p>
              <Link href="/markets/co/denver/collision-seo" className="mt-4 inline-block font-semibold text-amber-300 underline">
                Denver collision SEO market page
              </Link>
            </article>
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h2 className="text-lg font-semibold text-slate-100">Want help fixing it?</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                The scan is the front door. The real upside is knowing what to fix first and getting the site, local SEO, and conversion path cleaned up.
              </p>
              <Link href="/pricing" className="mt-4 inline-block font-semibold text-amber-300 underline">
                See monitoring and fix paths
              </Link>
            </article>
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
      </section>
    </main>
  );
}
