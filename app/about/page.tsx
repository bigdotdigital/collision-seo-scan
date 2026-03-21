import Link from 'next/link';
import { PublicPoweredByFooter } from '@/components/public-powered-by-footer';

export const metadata = {
  title: 'About Shop SEO Scan',
  description: 'Why Shop SEO Scan exists and who built it.'
};

export default function AboutPage() {
  return (
    <main className="diagnostic-page relative overflow-hidden py-16 md:py-20">
      <div className="diagnostic-bg-rings" />

      <section className="container-shell relative z-10">
        <div className="mx-auto max-w-4xl rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300/90">About Shop SEO Scan</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-100 md:text-6xl">
            Built for regular Main Street businesses, not generic SEO dashboards.
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300">
            Shop SEO Scan was created by{' '}
            <a
              href="https://bigdotdigital.com"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-amber-300 underline"
            >
              Big Dot Digital
            </a>{' '}
            after helping real auto body collision shops in Denver, Colorado improve their rankings and get more estimate opportunities.
          </p>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
            The reason it exists is simple: most mainstream SEO tools are built for marketing professionals and power users.
            They are full of jargon, giant dashboards, and generic metrics that do not map cleanly to what a regular shop owner
            actually needs to know week to week.
          </p>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
            This product is meant to feel different. It is for regular shop owners running regular Main Street businesses:
            collision, plumbing, HVAC, roofing, and the kinds of local service companies that keep towns and neighborhoods
            running. The goal is to help those businesses get marketing and SEO strategy that feels as thoughtful and capable
            as what the big national brands get.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/90">Why it exists</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                To make SEO and website improvement clearer, less bloated, and more useful for working business owners.
              </p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/90">What makes it different</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                It is built around local service businesses, practical actions, and the real-world gaps that affect calls, leads, and trust.
              </p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/90">What we believe</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                A local shop should be able to get marketing and SEO work that feels as sharp as what larger brands get from top agencies.
              </p>
            </article>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/collision#scan-form"
              className="inline-flex h-11 items-center rounded-md border border-amber-300/70 bg-amber-300 px-5 text-sm font-semibold text-black shadow-[0_0_24px_rgba(251,191,36,0.24)]"
            >
              Run Free Scan
            </Link>
            <a
              href="https://bigdotdigital.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center rounded-md border border-slate-500/70 bg-white/5 px-5 text-sm font-medium text-slate-100 backdrop-blur"
            >
              Visit Big Dot Digital
            </a>
          </div>

          <PublicPoweredByFooter className="mt-10" />
        </div>
      </section>
    </main>
  );
}
