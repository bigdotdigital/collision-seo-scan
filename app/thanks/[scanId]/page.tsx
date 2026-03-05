import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { sendFollowupEmail } from '@/lib/email';

function withTracking(baseUrl: string, scanId: string) {
  try {
    const u = new URL(baseUrl);
    u.searchParams.set('utm_source', 'collision-seo-scan');
    u.searchParams.set('utm_medium', 'report');
    u.searchParams.set('utm_campaign', 'teardown');
    u.searchParams.set('scanId', scanId);
    return u.toString();
  } catch {
    return `${baseUrl}?utm_source=collision-seo-scan&utm_medium=report&utm_campaign=teardown&scanId=${encodeURIComponent(scanId)}`;
  }
}

export default async function ThanksPage({
  params,
  searchParams
}: {
  params: { scanId: string };
  searchParams?: { book?: string };
}) {
  const scan = await prisma.scan.findUnique({ where: { id: params.scanId } });
  if (!scan) return notFound();

  if (searchParams?.book === '1' && !scan.bookedClicked) {
    await prisma.scan.update({
      where: { id: scan.id },
      data: { bookedClicked: true }
    });

    if (scan.email) {
      const appBase = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      await sendFollowupEmail({
        to: scan.email,
        shopName: scan.shopName,
        reportUrl: `${appBase}/report/${scan.id}`
      });
    }
  }

  const calendlyBase = process.env.CALENDLY_LINK || 'https://calendly.com/your-team/15min';
  const calendlyTracked = withTracking(calendlyBase, scan.id);

  return (
    <main className="container-shell py-14">
      <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Thanks</p>
        <h1 className="mt-3 text-3xl font-extrabold text-slate-900">We have your scan details.</h1>
        <p className="mt-3 text-slate-700">
          We will review your site and local market before the call so your teardown is specific and actionable.
        </p>

        <a
          href={calendlyTracked}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex rounded-md bg-teal-700 px-5 py-3 font-semibold text-white"
        >
          Continue to booking calendar
        </a>

        <p className="mt-4 text-sm text-slate-500">UTM and scan tracking were attached to your booking link.</p>

        <div className="mt-6">
          <Link href={`/report/${scan.id}`} className="text-sm text-teal-700 underline">
            Back to report
          </Link>
        </div>
      </div>
    </main>
  );
}
