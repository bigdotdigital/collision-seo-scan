import { ScanForm } from '@/components/scan-form';

export default function HomePage() {
  return (
    <main>
      <section className="bg-gradient-to-b from-teal-100 to-slate-50 py-16 md:py-20">
        <div className="container-shell">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">Collision SEO Scan</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
            Instant Local SEO report for collision repair shops.
          </h1>
          <p className="mt-4 max-w-2xl text-slate-600">
            Enter your shop info and get a scored audit with top leaks, money keywords, competitor snapshot, and a 30-day plan.
          </p>
          <p className="mt-3 text-sm text-slate-600">
            Already a client? <a className="text-teal-700 underline" href="/login">Open dashboard</a>
          </p>
        </div>
      </section>

      <section className="container-shell -mt-8 pb-10">
        <ScanForm />
      </section>

      <section className="container-shell grid gap-4 pb-16 md:grid-cols-3">
        <article className="card p-5">
          <h2 className="font-bold text-slate-900">What you get in 60 seconds</h2>
          <p className="mt-2 text-sm text-slate-600">Total score + website, local, and intent subscores with plain-English fixes.</p>
        </article>
        <article className="card p-5">
          <h2 className="font-bold text-slate-900">Actionable priorities</h2>
          <p className="mt-2 text-sm text-slate-600">Top 10 issues ranked by impact with why it matters and one-line fix guidance.</p>
        </article>
        <article className="card p-5">
          <h2 className="font-bold text-slate-900">Lead-ready keyword targets</h2>
          <p className="mt-2 text-sm text-slate-600">OEM + van + estimate terms tailored to your city for immediate content planning.</p>
        </article>
      </section>
      <section className="container-shell pb-10">
        <p className="text-xs text-slate-500">
          Aggregated market stats may be used in reports. We do not sell your contact info.
        </p>
      </section>
    </main>
  );
}
