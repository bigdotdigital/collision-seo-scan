'use client';

import { useEffect, useState } from 'react';
import { ScanLoadingShell } from '@/components/scan-loading';

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function ReportPendingScreen(args: {
  scanId: string;
  shopName: string;
  city: string;
  websiteUrl: string;
}) {
  const [active, setActive] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      while (!cancelled) {
        await wait(2500);

        try {
          const res = await fetch(`/api/scan/${args.scanId}`, {
            cache: 'no-store',
            headers: { accept: 'application/json' }
          });
          if (!res.ok) continue;

          const json = await res.json();
          const status = String(json?.scan?.executionStatus || '');
          if (status && status !== 'queued' && status !== 'running') {
            setActive(false);
            window.location.reload();
            return;
          }
        } catch {
          // Keep polling quietly until the scan finishes.
        }
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [args.scanId]);

  return (
    <div className="min-h-screen bg-[#0f0502]">
      <ScanLoadingShell
        open={active}
        websiteUrl={args.websiteUrl}
        city={args.city}
        shopName={args.shopName}
        completed={false}
      />
      <div className="sr-only">Scan still running. We will open the report automatically once it is ready.</div>
    </div>
  );
}
