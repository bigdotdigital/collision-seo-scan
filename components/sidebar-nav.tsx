'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type SidebarItem = {
  href: string;
  label: string;
  badge?: string;
  note?: string;
};

const MONITORING_ITEMS: SidebarItem[] = [
  { href: '/dashboard', label: 'Overview', note: 'Owner-first command center' },
  { href: '/dashboard/rankings', label: 'Rankings', note: 'Keyword movement and gaps' },
  { href: '/dashboard/competitors', label: 'Competitors', note: 'Head-to-head pressure' },
  { href: '/dashboard/alerts', label: 'Alerts', note: 'Live feed and thresholds' },
  { href: '/dashboard/reports', label: 'Reports', note: 'Snapshots and trend history' }
];

const ACCOUNT_ITEMS: SidebarItem[] = [
  { href: '/dashboard/onboarding', label: 'Onboarding', note: 'Workspace readiness' },
  { href: '/dashboard/billing', label: 'Billing', note: 'Plan and invoices' },
  { href: '/dashboard/settings', label: 'Settings', note: 'Location, users, alerts' }
];

type SidebarNavProps = {
  lastScanAt?: string | null;
};

export function SidebarNav({ lastScanAt }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <aside className="dashboard-sidebar">
      <div className="dashboard-sidebar-brand">
        <span className="dashboard-sidebar-brand-mark">BD</span>
        <div>
          <p className="dashboard-sidebar-kicker">Maroon Console</p>
          <p className="dashboard-sidebar-title">Big Dot Dashboard</p>
        </div>
      </div>

      <div className="dashboard-subpanel rounded-[24px] p-4">
        <p className="dashboard-sidebar-kicker">Last scan</p>
        <p className="mt-2 text-sm font-medium text-[var(--dashboard-text)]">
          {lastScanAt ? new Date(lastScanAt).toLocaleString() : 'No scan recorded yet'}
        </p>
        <p className="dashboard-sidebar-copy mt-2 text-sm">
          {lastScanAt
            ? 'Latest saved monitoring snapshot for this workspace.'
            : 'Run a scan to populate dashboard metrics and comparisons.'}
        </p>
      </div>

      <div className="space-y-5 px-2">
        <div>
          <p className="px-3 pb-2 dashboard-sidebar-kicker">Monitoring</p>
          <nav className="dashboard-nav-group">
            {MONITORING_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`dashboard-nav-link ${isActive ? 'dashboard-nav-link-active' : ''}`}
                >
                  <span>
                    <span className="dashboard-nav-label">{item.label}</span>
                    {item.note ? <span className="dashboard-nav-note">{item.note}</span> : null}
                  </span>
                  {item.badge ? (
                    <span className={`dashboard-status ${isActive ? 'dashboard-status-live' : 'dashboard-status-muted'}`}>
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          <p className="px-3 pb-2 dashboard-sidebar-kicker">Workspace</p>
          <nav className="dashboard-nav-group">
            {ACCOUNT_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`dashboard-nav-link ${isActive ? 'dashboard-nav-link-active' : ''}`}
                >
                  <span>
                    <span className="dashboard-nav-label">{item.label}</span>
                    {item.note ? <span className="dashboard-nav-note">{item.note}</span> : null}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="mt-auto rounded-[24px] border border-[var(--dashboard-border)] bg-[rgba(255,255,255,0.03)] p-4">
        <p className="dashboard-sidebar-kicker">Data honesty</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="dashboard-status dashboard-status-live">Live</span>
          <span className="dashboard-status dashboard-status-cached">Cached</span>
          <span className="dashboard-status dashboard-status-modeled">Modeled</span>
          <span className="dashboard-status dashboard-status-unknown">Unavailable</span>
        </div>
      </div>
    </aside>
  );
}
