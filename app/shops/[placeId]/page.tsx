import Link from 'next/link';

export default function ShopProfileComingSoon({ params }: { params: { placeId: string } }) {
  return (
    <main className="container-shell py-16">
      <h1 className="text-3xl font-bold text-slate-900">Shop Profile</h1>
      <p className="mt-3 max-w-2xl text-slate-700">
        Public shop profile pages are coming soon. Place ID: <span className="font-mono">{params.placeId}</span>
      </p>
      <div className="mt-6">
        <Link href="/collision" className="rounded-md bg-teal-700 px-4 py-2 font-semibold text-white">
          Run a Fresh Scan
        </Link>
      </div>
    </main>
  );
}
