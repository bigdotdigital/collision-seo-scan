import { TeardownIntakeForm } from '@/components/teardown-intake-form';

export default function TeardownIntakePage({
  searchParams
}: {
  searchParams?: {
    scanId?: string;
    orgId?: string;
    vertical?: string;
    email?: string;
    phone?: string;
    intent?: string;
  };
}) {
  return (
    <main className="container-shell report-variant py-14">
      <div className="report-ambient-glow" />
      <div className="report-noise-overlay" />
      <TeardownIntakeForm
        scanId={searchParams?.scanId || ''}
        orgId={searchParams?.orgId || ''}
        vertical={searchParams?.vertical || 'collision'}
        email={searchParams?.email || ''}
        phone={searchParams?.phone || ''}
        initialIntent={searchParams?.intent || 'fix_seo'}
      />
    </main>
  );
}
