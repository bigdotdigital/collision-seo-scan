'use client';

import { useState } from 'react';
import { passwordPolicyHint } from '@/lib/password-policy';

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
  const passwordHint = password
    ? passwordPolicyHint(password)
    : 'Use 10+ characters with upper/lowercase letters and a number.';
  const passwordLooksStrong = password.length > 0 && passwordHint === 'Strong password';

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
      <p className="mb-4 text-sm text-slate-600">
        Create your account, start your free trial, and keep this workspace tied to your saved scan data from day one.
      </p>
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
          minLength={10}
          required
        />
        <p className={`mt-2 text-xs ${passwordLooksStrong ? 'text-emerald-700' : 'text-slate-500'}`}>
          {passwordHint}
        </p>
      </div>

      <div className="monitor-dashed-divider" />

      <div className="mb-4 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <div>Included in the $49 plan:</div>
        <div>• weekly scan refreshes and saved history</div>
        <div>• local demand context for your market</div>
        <div>• owner dashboard, reports, and monitoring workspace</div>
      </div>

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

      <p className="mt-3 text-xs text-slate-500">
        We save your workspace and scan history so your dashboard stays useful even when third-party providers are slow.
      </p>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="mt-3 text-sm text-emerald-700">{success}</p> : null}
    </article>
  );
}
