import Link from 'next/link';
import { PublicSeoSchema } from '@/components/public-seo-schema';

export default function CityCollisionSeoPage({ params }: { params: { state: string; city: string } }) {
  const cityLabel = decodeURIComponent(params.city).replace(/-/g, ' ');
  const stateLabel = decodeURIComponent(params.state).toUpperCase();
  const path = `/markets/${params.state}/${params.city}/collision-seo`;
  return (
    <main className="container-shell py-16">
      <PublicSeoSchema
        title={`Collision SEO in ${cityLabel}, ${stateLabel} | Shop SEO Scan`}
        description={`Run a collision SEO scan for a body shop in ${cityLabel}, ${stateLabel}. See local ranking gaps, trust leaks, and the next fixes most likely to improve estimate demand.`}
        path={path}
      />
      <h1 className="text-3xl font-bold text-slate-900">
        Collision SEO in {cityLabel}, {stateLabel}
      </h1>
      <p className="mt-3 max-w-2xl text-slate-700">
        Run a free collision SEO scan for a body shop in {cityLabel} and see what is holding back local rankings, trust, and estimate conversion.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/collision" className="rounded-md bg-teal-700 px-4 py-2 font-semibold text-white">
          Start Scan
        </Link>
        <Link href="/collision-seo" className="rounded-md bg-slate-900 px-4 py-2 font-semibold text-white">
          Collision SEO Overview
        </Link>
      </div>
    </main>
  );
}
