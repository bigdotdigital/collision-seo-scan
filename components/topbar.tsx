'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

function MagnifyingGlassIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 0 1 5.454 1.31A8.967 8.967 0 0 1 18 9.75V9a6 6 0 1 0-12 0v.75a8.967 8.967 0 0 1-2.312 6.642 23.848 23.848 0 0 1 5.454-1.31m5.715 0a24.255 24.255 0 0 0-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
      />
    </svg>
  );
}

function Cog6ToothIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12a7.5 7.5 0 0 1 15 0m-15 0a7.47 7.47 0 0 0 .56 2.833m-.56-2.833a7.47 7.47 0 0 1 .56-2.833m14.44 2.833a7.47 7.47 0 0 1-.56 2.833m.56-2.833a7.47 7.47 0 0 0-.56-2.833M8.23 16.23l-.53.53a2.25 2.25 0 1 0 3.182 3.182l.53-.53m0-14.824-.53-.53A2.25 2.25 0 0 0 7.7 7.242l.53.53m8.07 8.458.53.53a2.25 2.25 0 0 1-3.182 3.182l-.53-.53m0-14.824.53-.53a2.25 2.25 0 0 1 3.182 3.182l-.53.53M12 15.75A3.75 3.75 0 1 0 12 8.25a3.75 3.75 0 0 0 0 7.5Z"
      />
    </svg>
  );
}

export function Topbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    if (/(report|scan|history)/.test(query)) {
      router.push('/dashboard/reports');
      return;
    }
    if (/(rank|keyword|position)/.test(query)) {
      router.push('/dashboard/rankings');
      return;
    }
    if (/(competitor|rival|compare)/.test(query)) {
      router.push('/dashboard/competitors');
      return;
    }
    if (/(alert|notification|notify)/.test(query)) {
      router.push('/dashboard/alerts');
      return;
    }
    if (/(bill|invoice|payment|plan)/.test(query)) {
      router.push('/dashboard/billing');
      return;
    }
    if (/(setting|account|profile|keyword|location)/.test(query)) {
      router.push('/dashboard/settings');
      return;
    }

    router.push('/dashboard');
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-surface)] px-4 md:px-8">
      <div className="flex items-center gap-4">
        <form
          onSubmit={handleSearch}
          className="flex w-full max-w-80 items-center rounded-md border border-transparent bg-[var(--bg-body)] px-4 py-2 focus-within:border-[var(--primary)]"
        >
          <MagnifyingGlassIcon className="h-5 w-5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search keywords, competitors, or locations..."
            className="ml-3 w-full bg-transparent text-sm outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <Link
          href="/dashboard/alerts"
          className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)]"
          aria-label="Notifications"
        >
          <BellIcon className="h-5 w-5" />
        </Link>
        <Link
          href="/dashboard/settings"
          className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)]"
          aria-label="Settings"
        >
          <Cog6ToothIcon className="h-5 w-5" />
        </Link>
        <div className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[var(--primary-light)] text-sm font-bold text-[var(--primary)]">
          DB
        </div>
      </div>
    </header>
  );
}
