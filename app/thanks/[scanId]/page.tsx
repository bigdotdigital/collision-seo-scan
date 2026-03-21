import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicPoweredByFooter } from '@/components/public-powered-by-footer';
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

  const calendlyBase =
    process.env.CALENDLY_LINK ||
    process.env.CALENDLY_URL ||
    process.env.BOOKING_LINK ||
    process.env.NEXT_PUBLIC_CALENDLY_LINK ||
    'https://calendly.com/bigdotdigital/30min';
  const calendlyTracked = withTracking(calendlyBase, scan.id);

  return (
    <main className="container-shell report-variant py-14">
      <div className="report-ambient-glow" />
      <div className="report-noise-overlay" />

      <div className="mx-auto max-w-2xl rounded-3xl border border-white/15 bg-[rgba(40,35,32,0.45)] p-8 text-center shadow-[0_16px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c49a7a]">Thanks</p>
        <h1 className="mt-3 text-3xl font-extrabold text-white">We have your scan details.</h1>
        <p className="mt-3 text-[#d8d2cd]">
          We will review your site and local market before the call so your teardown is specific and actionable.
        </p>
        <div className="mt-6 grid gap-3 text-left md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c49a7a]">Understand</p>
            <p className="mt-2 text-sm text-white/85">See what is hurting rankings, trust, and estimate demand.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c49a7a]">Prioritize</p>
            <p className="mt-2 text-sm text-white/85">Get a clear order of fixes instead of a pile of generic SEO advice.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c49a7a]">Customize</p>
            <p className="mt-2 text-sm text-white/85">We can tailor the dashboard around your shop’s service mix and goals.</p>
          </div>
        </div>

        <a
          href={calendlyTracked}
          target="_blank"
          rel="noreferrer"
          className="btn-variant-primary mt-6 px-5 py-3"
        >
          Continue to booking calendar
        </a>

        <p className="mt-4 text-sm text-white/60">
          UTM and scan tracking were attached to your booking link.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <Link href={`/report/${scan.id}`} className="text-sm text-[#c49a7a] underline">
            Back to report
          </Link>
          <Link href={`/monitoring?scanId=${scan.id}`} className="text-sm text-white/80 underline">
            Or start the dashboard trial instead
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-2xl">
        <PublicPoweredByFooter />
      </div>
    </main>
  );
}
