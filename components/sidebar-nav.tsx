'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type SidebarItem = {
  href: string;
  label: string;
  badge?: string;
};

const MONITORING_ITEMS: SidebarItem[] = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/rankings', label: 'Rankings' },
  { href: '/dashboard/competitors', label: 'Competitors' },
  { href: '/dashboard/alerts', label: 'Alerts' }
];

const ACCOUNT_ITEMS: SidebarItem[] = [
  { href: '/dashboard/billing', label: 'Billing' },
  { href: '/dashboard/settings', label: 'Settings' }
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="card h-fit overflow-hidden p-0 md:sticky md:top-6">
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-900 to-slate-700 px-4 py-4 text-white">
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/70">Big Dot</p>
        <p className="mt-1 text-sm font-semibold">Collision Monitor</p>
      </div>

      <div className="space-y-5 p-3">
        <div>
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Monitoring</p>
          <nav className="space-y-1">
            {MONITORING_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                    isActive
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span className={`text-[10px] uppercase tracking-wide ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Account</p>
          <nav className="space-y-1">
            {ACCOUNT_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                    isActive
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-800">Monitoring mode</p>
          <p className="mt-1">Alerts and trends are prioritized over analytics bloat.</p>
        </div>
      </div>
    </aside>
  );
}
