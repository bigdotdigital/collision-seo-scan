import Link from 'next/link';
import demo from '@/fixtures/demo-report.json';

export default function DemoReportPage() {
  return (
    <main className="container-shell py-10">
      <section className="card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Demo Report</p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900">{demo.shopName}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {demo.city} • {demo.websiteUrl}
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-5">
          <article className="rounded border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Overall</p>
            <p className="text-2xl font-bold">{demo.overallScore}</p>
          </article>
          {Object.entries(demo.categoryScores).map(([k, v]) => (
            <article key={k} className="rounded border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs capitalize text-slate-500">{k}</p>
              <p className="text-2xl font-bold">{v}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded border border-slate-200 p-4">
            <h2 className="font-semibold text-slate-900">Top fixes</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {demo.topFixes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="rounded border border-slate-200 p-4">
            <h2 className="font-semibold text-slate-900">Signals snapshot</h2>
            <p className="mt-2 text-sm font-medium text-emerald-700">Detected</p>
            <p className="text-sm text-slate-700">{demo.detectedSignals.join(', ')}</p>
            <p className="mt-2 text-sm font-medium text-amber-700">Missing</p>
            <p className="text-sm text-slate-700">{demo.missingSignals.join(', ')}</p>
          </article>
        </div>

        <div className="mt-6">
          <Link href="/" className="text-sm font-semibold text-teal-700 underline">
            Run a live scan
          </Link>
        </div>
      </section>
    </main>
  );
}
