'use client';

import { useEffect, useState } from 'react';

export function ReportStatusWatcher({ scanId }: { scanId: string }) {
  const [lastCheckedLabel, setLastCheckedLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/scan/${scanId}`, {
          cache: 'no-store',
          headers: { accept: 'application/json' }
        });

        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;

        const status = String(json?.scan?.executionStatus || '');
        setLastCheckedLabel(
          new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit'
          }).format(new Date())
        );

        if (status && status !== 'queued' && status !== 'running') {
          window.location.reload();
        }
      } catch {
        // Keep polling quietly; the holding screen should recover on the next tick.
      }
    };

    poll();
    const interval = window.setInterval(poll, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [scanId]);

  return (
    <p className="mt-3 text-xs text-slate-500">
      Auto-refreshing every 5s{lastCheckedLabel ? ` • last checked ${lastCheckedLabel}` : ''}
    </p>
  );
}
