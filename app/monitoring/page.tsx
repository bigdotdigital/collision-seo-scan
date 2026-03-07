import Link from 'next/link';
import { MonitoringTrialForm } from '@/components/monitoring-trial-form';

type Query = {
  scanId?: string;
  orgId?: string;
  email?: string;
  shop?: string;
  city?: string;
};

export default function MonitoringLandingPage({
  searchParams
}: {
  searchParams?: Query;
}) {
  const scanId = searchParams?.scanId || '';
  const orgId = searchParams?.orgId || '';
  const email = searchParams?.email || '';
  const shop = searchParams?.shop || 'Your Shop';
  const city = searchParams?.city || 'your market';

  const calendlyUrl = process.env.CALENDLY_LINK || 'https://calendly.com/bigdotdigital/30min';
  const supportEmail = process.env.REPLY_TO_EMAIL || 'bigdotdigital@gmail.com';

  return (
    <main className="container-shell pb-20 pt-12">
      <section className="mx-auto max-w-4xl space-y-6">
        <article className="card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
            Big Dot Monitoring
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Launch your SEO monitoring dashboard in minutes
          </h1>
          <p className="mt-2 text-sm text-slate-700">
            {shop} in {city}: start self-serve for $49/month with a 30-day free trial. No call
            required. If you want strategy support, setup calls are always available.
          </p>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Weekly rankings + competitor movement</li>
            <li>Priority task feed focused on call-generating fixes</li>
            <li>Free setup call + optional monthly SEO consults included</li>
          </ul>
        </article>

        <MonitoringTrialForm
          scanId={scanId || undefined}
          orgId={orgId || undefined}
          defaultEmail={email || undefined}
          defaultName={shop !== 'Your Shop' ? shop : undefined}
          calendlyUrl={calendlyUrl}
          supportEmail={supportEmail}
        />

        <div className="text-sm text-slate-600">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-teal-700 underline">
            Login to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
