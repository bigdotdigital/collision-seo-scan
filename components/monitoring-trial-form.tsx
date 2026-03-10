'use client';

import { useState } from 'react';

type MonitoringTrialFormProps = {
  scanId?: string;
  orgId?: string;
  defaultEmail?: string;
  defaultName?: string;
  calendlyUrl: string;
  supportEmail: string;
};

export function MonitoringTrialForm({
  scanId,
  orgId,
  defaultEmail,
  defaultName,
  calendlyUrl,
  supportEmail
}: MonitoringTrialFormProps) {
  const [email, setEmail] = useState(defaultEmail || '');
  const [name, setName] = useState(defaultName || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function startTrial() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/auth/start-trial', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scanId,
          orgId,
          email: email || undefined,
          name: name || undefined,
          password: password || undefined
        })
      });

      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res.ok || !data?.url) {
        setError(data?.error || 'Could not start your free trial. Please try again.');
        return;
      }
      setSuccess('Trial started. Redirecting to onboarding...');
      window.location.href = data.url;
    } catch {
      setError('Could not start trial right now. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function startBillingOptional() {
    setBillingLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scanId,
          orgId,
          email: email || undefined,
          name: name || undefined,
          password: password || undefined
        })
      });

      const data = (await res.json().catch(() => null)) as
        | { url?: string; error?: string; portalUrl?: string }
        | null;
      if (res.status === 409 && data?.portalUrl) {
        window.location.href = data.portalUrl;
        return;
      }
      if (!res.ok || !data?.url) {
        setError(data?.error || 'Could not start checkout. Continue with trial and add billing later.');
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Could not start checkout right now. Continue with trial and add billing later.');
    } finally {
      setBillingLoading(false);
    }
  }

  return (
    <article className="monitor-card">
      <h2 className="monitor-h2">Get started</h2>
      <div className="monitor-input-group">
        <label className="monitor-label">Name (optional)</label>
        <input
          className="monitor-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Diana Kemmer"
        />
      </div>
      <div className="monitor-input-group">
        <label className="monitor-label">Email address</label>
        <input
          className="monitor-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="diana@example.com"
          type="email"
          required
        />
      </div>
      <div className="monitor-input-group">
        <label className="monitor-label">Create password</label>
        <input
          className="monitor-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          type="password"
          minLength={8}
          required
        />
      </div>

      <div className="monitor-dashed-divider" />

      <button onClick={startTrial} disabled={loading} className="monitor-btn-primary">
        <span>{loading ? 'Starting free trial...' : 'Create account + start free trial'}</span>
        <span className="monitor-btn-icon" aria-hidden>
          →
        </span>
      </button>

      <button
        onClick={startBillingOptional}
        disabled={billingLoading || loading}
        className="monitor-link-secondary"
        type="button"
      >
        {billingLoading ? 'Opening billing...' : 'Add payment method now (optional)'}
      </button>

      <a href={calendlyUrl} target="_blank" rel="noreferrer" className="monitor-link-secondary">
        Book optional setup call
      </a>
      <a
        href={`mailto:${supportEmail}?subject=${encodeURIComponent('Dashboard customization help')}`}
        className="monitor-link-secondary"
      >
        Questions? Email support
      </a>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="mt-3 text-sm text-emerald-700">{success}</p> : null}
    </article>
  );
}
