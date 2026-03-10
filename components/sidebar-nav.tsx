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
  { href: '/dashboard/alerts', label: 'Alerts' },
  { href: '/dashboard/reports', label: 'Reports' }
];

const ACCOUNT_ITEMS: SidebarItem[] = [
  { href: '/dashboard/onboarding', label: 'Onboarding' },
  { href: '/dashboard/billing', label: 'Billing' },
  { href: '/dashboard/settings', label: 'Settings' }
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="dashboard-sidebar">
      <div className="mb-8 flex items-center gap-2 px-5">
        <span className="h-3 w-3 rounded-full bg-[#ff4d5b]" />
        <p className="text-2xl font-bold tracking-tight text-white">BIG DOT</p>
      </div>
      <div className="space-y-5 px-4">
        <div>
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/35">Monitoring</p>
          <nav className="space-y-1">
            {MONITORING_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition ${
                    isActive
                      ? 'border-[#4a1218] bg-[#3a0e13] text-white'
                      : 'border-transparent text-white/60 hover:border-[#3a1015] hover:bg-[#22090c] hover:text-white'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span className={`text-[10px] uppercase tracking-wide ${isActive ? 'text-white/80' : 'text-white/45'}`}>
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/35">Settings</p>
          <nav className="space-y-1">
            {ACCOUNT_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition ${
                    isActive
                      ? 'border-[#4a1218] bg-[#3a0e13] text-white'
                      : 'border-transparent text-white/60 hover:border-[#3a1015] hover:bg-[#22090c] hover:text-white'
                  }`}
                >
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
}
