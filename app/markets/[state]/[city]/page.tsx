import Link from 'next/link';

export default function CityMarketPage({ params }: { params: { state: string; city: string } }) {
  return (
    <main className="container-shell py-16">
      <h1 className="text-3xl font-bold text-slate-900">
        {params.city}, {params.state} Market SEO
      </h1>
      <p className="mt-3 max-w-2xl text-slate-700">
        Market pages are coming soon. Run a live scan now while we roll out city market intelligence.
      </p>
      <div className="mt-6">
        <Link href="/collision" className="rounded-md bg-teal-700 px-4 py-2 font-semibold text-white">
          Run Collision Scan
        </Link>
      </div>
    </main>
  );
}
