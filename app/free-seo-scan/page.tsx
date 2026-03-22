import type { Metadata } from 'next';
import Link from 'next/link';
import { ScanForm } from '@/components/scan-form';
import { PublicPoweredByFooter } from '@/components/public-powered-by-footer';

export const metadata: Metadata = {
  title: 'Free SEO Scan | Instant Website SEO Scan for Local Service Businesses',
  description:
    'Run a free SEO scan for your local service business. Get a fast report on website leaks, local SEO gaps, competitor pressure, and the fixes most likely to improve calls and leads.',
  alternates: {
    canonical: 'https://shopseoscan.com/free-seo-scan'
  }
};

const bullets = [
  'Free SEO scan with no payment required',
  'Built for collision, HVAC, roofing, and plumbing',
  'Fast issue list, competitor context, and 30-day priorities'
];

const sections = [
  {
    title: 'What a free SEO scan should actually tell you',
    body:
      'Most free SEO tools stop at surface-level scores. Shop SEO Scan is built to show what is broken, why it matters for a real local business, and what should get fixed first.'
  },
  {
    title: 'Built for regular service businesses',
    body:
      'This scanner is being shaped around the realities of collision shops, HVAC companies, roofers, plumbers, and the kinds of local businesses that need calls and booked jobs, not vanity charts.'
  },
  {
    title: 'A better first step than generic SEO software',
    body:
      'If you want a fast website SEO scan before hiring anyone, this gives you the useful version: local visibility, trust gaps, competitor pressure, and practical next moves.'
  }
];

export default function FreeSeoScanPage() {
  return (
    <main className="diagnostic-page relative overflow-hidden py-16 md:py-20">
      <div className="diagnostic-bg-rings" />

      <section className="container-shell relative z-10">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur md:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300/90">Free SEO Scan</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-slate-100 md:text-6xl">
              Instant free SEO scan for local service businesses.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300">
              Run a free website SEO scan and get a report on visibility leaks, local ranking gaps, competitor pressure,
              and the practical fixes most likely to improve calls and leads.
            </p>

            <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-300">
              {bullets.map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-10 grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
                <h2 className="text-xl font-semibold text-slate-100">Run your free SEO scan</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Start with your website, city, and business name. We&apos;ll generate a real report, not just a vanity score.
                </p>
                <div className="mt-6">
                  <ScanForm vertical="collision" />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/90">Why this works</p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
                  <li>See what is blocking visibility right now</li>
                  <li>Understand how local competitors are stronger</li>
                  <li>Get a fix order you can actually act on</li>
                  <li>Use the report to decide whether to DIY, monitor, or hire help</li>
                </ul>
                <div className="mt-6 space-y-2 text-sm">
                  <Link href="/demo" className="block font-semibold text-amber-300 underline">
                    See example report
                  </Link>
                  <Link href="/free-collision-seo-scan" className="block font-semibold text-amber-300 underline">
                    Looking for a free collision SEO scan?
                  </Link>
                  <Link href="/pricing" className="block font-semibold text-amber-300 underline">
                    View plans and dashboard options
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

            <PublicPoweredByFooter className="mt-10" />
          </div>
        </div>
      </section>
    </main>
  );
}
