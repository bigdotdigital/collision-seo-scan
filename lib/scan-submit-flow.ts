export type ScanSubmitDecision =
  | { action: 'reuse'; nextUrl: string }
  | { action: 'redirect_on_error'; nextUrl: string }
  | { action: 'wait_for_completion'; nextUrl: string; statusUrl?: string | null }
  | { action: 'error'; message: string };

export function resolveScanSubmitDecision(args: {
  ok: boolean;
  json: {
    reused?: boolean;
    nextUrl?: string | null;
    statusUrl?: string | null;
    scanId?: string | null;
    error?: string | null;
  };
}): ScanSubmitDecision {
  const nextUrl = typeof args.json?.nextUrl === 'string' && args.json.nextUrl ? args.json.nextUrl : null;

  if (args.json?.reused && nextUrl) {
    return { action: 'reuse', nextUrl };
  }

  if (!args.ok) {
    if (nextUrl) {
      return { action: 'redirect_on_error', nextUrl };
    }
    return { action: 'error', message: args.json?.error || 'Scan failed' };
  }

  return {
    action: 'wait_for_completion',
    nextUrl: nextUrl || `/report/${args.json?.scanId || ''}`,
    statusUrl: typeof args.json?.statusUrl === 'string' ? args.json.statusUrl : null
  };
}
