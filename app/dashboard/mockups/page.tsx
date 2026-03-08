import Link from 'next/link';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

const PAGES = [
  { href: '/dashboard', label: 'Overview', note: 'Command center + priority tasks' },
  { href: '/dashboard/rankings', label: 'Keyword Rankings', note: 'Filters, table, trend bars, opportunity' },
  { href: '/dashboard/competitors', label: 'Competitors', note: 'Head-to-head matrix + SOV cards' },
  { href: '/dashboard/alerts', label: 'Alerts Feed', note: 'Severity feed + alert settings rail' },
  { href: '/dashboard/reports', label: 'Reports & Scan History', note: 'Trend strip + monthly report rows' },
  { href: '/dashboard/billing', label: 'Plans & Billing', note: 'Current plan, upgrade, invoice history' },
  { href: '/dashboard/settings', label: 'Account Settings', note: 'Location, tracking, alerts, team' }
];

export default function DashboardMockupsIndexPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard Mockups"
        subtitle="Open each page to review the full Variant-aligned product flow."
        eyebrow="QA / Design Review"
      />

      <div className="grid gap-3 md:grid-cols-2">
        {PAGES.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className="card block rounded-xl border border-white/10 p-5 transition hover:border-[#ff4d5b]/50"
          >
            <p className="text-xl font-semibold text-white">{page.label}</p>
            <p className="mt-1 text-sm text-white/65">{page.note}</p>
            <p className="mt-3 text-xs text-[#ff8a93]">Open {page.href}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
