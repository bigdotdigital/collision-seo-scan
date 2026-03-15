import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicProfileActionButton } from '@/components/public-profile-action-button';
import { loadPublicShopReport } from '@/lib/public-report';

type Params = {
  state: string;
  city: string;
  shopSlug: string;
};

async function getPageState(params: Params) {
  return loadPublicShopReport(params);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const state = await getPageState(params);
  if (!state) {
    return {
      title: 'Collision Repair SEO Report',
      robots: { index: false, follow: false }
    };
  }

  const title = `Collision Repair SEO Report for ${state.shop.name}`;
  const description = `${state.shop.name} in ${state.shop.city || 'its market'}, ${state.shop.state || ''}. Last scanned ${state.scan.createdAt.toLocaleDateString()}. Overall visibility score ${state.scan.scoreTotal}.`;
  const path = `/collision-repair-seo-report/${params.state}/${params.city}/${params.shopSlug}`;

  return {
    title,
    description,
    alternates: {
      canonical: path
    },
    robots: state.isThin
      ? { index: false, follow: true }
      : { index: true, follow: true }
  };
}

export default async function PublicCollisionReportPage({ params }: { params: Params }) {
  const state = await getPageState(params);
  if (!state) return notFound();

  const findings = state.summary.findings || [];
  const signals = state.summary.measuredSignals || [];

  return (
    <main className="container-shell py-12">
      <section className="card">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          Collision Repair SEO Report
        </p>
        <h1 className="mt-3 text-4xl font-bold text-slate-900">{state.shop.name}</h1>
        <p className="mt-3 text-sm text-slate-600">
          {state.shop.city}, {state.shop.state} • Last scanned {state.scan.createdAt.toLocaleDateString()}
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Overall score</p>
            <p className="mt-2 text-4xl font-bold text-slate-900">{state.scan.scoreTotal}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Data freshness</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {state.isThin ? 'Partial coverage' : 'Publishable summary'}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {state.isThin
                ? 'This page stays conservative because current scan coverage is incomplete.'
                : 'This summary includes measured findings from the latest completed scan.'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Profile actions</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <PublicProfileActionButton action="claim" shopId={state.shop.id} scanId={state.scan.id} label="Claim this profile" />
              <PublicProfileActionButton action="rescan" shopId={state.shop.id} scanId={state.scan.id} label="Request re-scan" />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <article className="card">
          <h2 className="text-xl font-bold text-slate-900">Measured findings</h2>
          <p className="mt-2 text-sm text-slate-600">
            Neutral scan observations from the latest completed report. This page only shows measured or clearly derived summary data.
          </p>
          <div className="mt-5 space-y-3">
            {findings.length > 0 ? (
              findings.map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-2 text-sm text-slate-700">{item.why}</p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                Not enough measured findings were available to publish more detail on this scan.
              </div>
            )}
          </div>

          <h3 className="mt-8 text-lg font-bold text-slate-900">Measured site signals</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {signals.length > 0 ? (
              signals.map((signal) => (
                <span key={signal} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700">
                  {signal}
                </span>
              ))
            ) : (
              <p className="text-sm text-slate-600">Measured site signals were limited in this scan.</p>
            )}
          </div>
        </article>

        <aside className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-bold text-slate-900">Unlock the full report</h2>
            <p className="mt-2 text-sm text-slate-600">
              Full dashboard access includes keyword gap analysis, maps authority, competitor comparison, and repair-plan recommendations.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>Keyword opportunity analysis</li>
              <li>Maps authority and review gap detail</li>
              <li>Competitor gap and market graph detail</li>
              <li>Repair plan and revenue leak analysis</li>
            </ul>
            <div className="mt-5">
              <Link href="/pricing" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                View plans
              </Link>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-bold text-slate-900">Request updates</h2>
            <p className="mt-2 text-sm text-slate-600">
              If the business info is wrong or you want this profile updated, claimed, or removed from indexing, use the request actions below.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <PublicProfileActionButton action="update" shopId={state.shop.id} scanId={state.scan.id} label="Correct business info" />
              <PublicProfileActionButton action="opt_out" shopId={state.shop.id} scanId={state.scan.id} label="Request opt-out" />
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
