import Link from 'next/link';

export default function CityCollisionSeoPage({ params }: { params: { state: string; city: string } }) {
  return (
    <main className="container-shell py-16">
      <h1 className="text-3xl font-bold text-slate-900">
        Collision SEO in {params.city}, {params.state}
      </h1>
      <p className="mt-3 max-w-2xl text-slate-700">
        Public market pages are being expanded. Get a shop-specific report with the live scanner now.
      </p>
      <div className="mt-6">
        <Link href="/collision" className="rounded-md bg-teal-700 px-4 py-2 font-semibold text-white">
          Start Scan
        </Link>
      </div>
    </main>
  );
}
