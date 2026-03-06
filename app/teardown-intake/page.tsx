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
  };
}) {
  return (
    <main className="container-shell py-14">
      <TeardownIntakeForm
        scanId={searchParams?.scanId || ''}
        orgId={searchParams?.orgId || ''}
        vertical={searchParams?.vertical || 'collision'}
        email={searchParams?.email || ''}
        phone={searchParams?.phone || ''}
      />
    </main>
  );
}
