'use client';

import { createPortal } from 'react-dom';
import { useEffect, useMemo, useState } from 'react';

type ScanStep = {
  id: string;
  title: string;
  detail: string;
};

type ScanLoadingShellProps = {
  open: boolean;
  websiteUrl: string;
  city: string;
  shopName: string;
  completed: boolean;
  finalScore?: number | null;
  screenshotUrl?: string;
  externalStepIndex?: number;
};

const STEPS: ScanStep[] = [
  { id: 'capture', title: 'Capturing homepage', detail: '200 OK • 124ms' },
  { id: 'mobile', title: 'Checking mobile layout', detail: 'Responsive • Viewport valid' },
  { id: 'trust', title: 'Detecting trust signals', detail: 'Found: Reviews, badges' },
  { id: 'cta', title: 'Evaluating CTA visibility', detail: 'Analyzing contrast ratios…' },
  { id: 'speed', title: 'Measuring speed / load feel', detail: 'Queued' },
  { id: 'competitors', title: 'Comparing competitor positioning', detail: 'Queued' },
  { id: 'plan', title: 'Building action plan', detail: 'Queued' }
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function scoreForProgress(progress: number, finalScore?: number | null): number {
  if (typeof finalScore === 'number') return clamp(finalScore, 0, 100);
  return clamp(Math.round(36 + progress * 0.58), 0, 100);
}

export function ScanOverlayHighlights({
  activeStep,
  completedCount
}: {
  activeStep: number;
  completedCount: number;
}) {
  const chips = [
    {
      id: 'cta',
      label: 'Analyzing CTA',
      color: 'bg-amber-300',
      position: 'top-28 left-8',
      delay: '0.1s',
      visible: activeStep >= 2
    },
    {
      id: 'ssl',
      label: 'SSL Verified',
      color: 'bg-emerald-400',
      position: 'top-20 right-10',
      delay: '0.2s',
      visible: completedCount >= 1
    },
    {
      id: 'shift',
      label: 'Mobile Layout Shift',
      color: 'bg-rose-400',
      position: 'bottom-32 left-1/2 -translate-x-1/2',
      delay: '0.35s',
      visible: activeStep >= 3
    }
  ];

  return (
    <div className="pointer-events-none absolute inset-0 p-6">
      {chips
        .filter((chip) => chip.visible)
        .map((chip) => (
          <div
            key={chip.id}
            className={`variant-status-pill absolute ${chip.position}`}
            style={{ animationDelay: chip.delay }}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${chip.color}`} />
            <span className="text-white/95">{chip.label}</span>
          </div>
        ))}
    </div>
  );
}

export function WebsitePreviewDiagnostic({
  websiteUrl,
  activeStep,
  completedCount
}: {
  websiteUrl: string;
  activeStep: number;
  completedCount: number;
}) {
  const prettyUrl = websiteUrl.replace(/^https?:\/\//, '') || 'collision-repair-center.com';

  return (
    <section className="relative flex flex-1 flex-col border-b border-white/10 bg-black/20 md:border-b-0 md:border-r md:border-r-white/10">
      <div className="flex h-10 items-center gap-2 border-b border-white/10 bg-white/5 px-4">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
        </div>
        <div className="ml-2 inline-flex items-center gap-2 rounded bg-white/5 px-3 py-1 font-mono text-[10px] tracking-wide text-white/50">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
          {prettyUrl}
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden p-6">
        <div className="variant-loader-line" />

        <div className="mx-auto max-w-md space-y-6 opacity-65">
          <div className="mb-8 flex justify-between">
            <div className="variant-skeleton h-6 w-24" />
            <div className="flex gap-4">
              <div className="variant-skeleton h-4 w-16" />
              <div className="variant-skeleton h-4 w-16" />
              <div className="variant-skeleton h-4 w-20 bg-white/10" />
            </div>
          </div>

          <div className="grid grid-cols-2 items-center gap-6">
            <div className="space-y-3">
              <div className="variant-skeleton h-8 w-full" />
              <div className="variant-skeleton h-8 w-3/4" />
              <div className="variant-skeleton mt-4 h-24 w-full" />
              <div className="variant-skeleton mt-2 h-10 w-32 rounded" />
            </div>
            <div className="variant-skeleton h-48 w-full rounded-lg border border-white/5" />
          </div>

          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="variant-skeleton h-32 w-full rounded-lg" />
            <div className="variant-skeleton h-32 w-full rounded-lg" />
            <div className="variant-skeleton h-32 w-full rounded-lg" />
          </div>
        </div>

        <ScanOverlayHighlights activeStep={activeStep} completedCount={completedCount} />
      </div>

      <div className="flex h-8 items-center justify-between border-t border-white/10 px-4 font-mono text-[10px] uppercase tracking-wider text-white/45">
        <span>Viewport: 1440x900</span>
        <span>Render Time: 24ms</span>
      </div>
    </section>
  );
}

export function DiagnosticStepList({
  activeStep,
  completed,
  completedCount
}: {
  activeStep: number;
  completed: boolean;
  completedCount: number;
}) {
  return (
    <div className="space-y-0">
      {STEPS.map((step, index) => {
        const done = completed || index < completedCount;
        const active = !completed && index === activeStep;
        const pending = !done && !active;

        return (
          <div key={step.id} className={`variant-step-row relative pl-6 pb-6 ${pending ? 'opacity-45' : ''}`}>
            {index < STEPS.length - 1 ? <span className={`variant-step-line ${active ? 'variant-step-line-active' : ''}`} /> : null}

            <span
              className={`variant-step-dot ${done ? 'variant-step-dot-done' : active ? 'variant-step-dot-active' : 'variant-step-dot-pending'}`}
            >
              {done ? '✓' : active ? <span className="h-1.5 w-1.5 rounded-full bg-amber-300" /> : null}
            </span>

            <div className={`text-sm ${active ? 'font-semibold text-white' : 'font-medium text-white/90'}`}>
              {step.title}
            </div>
            <div className={`mt-1 font-mono text-[11px] ${active ? 'text-amber-200' : 'text-white/45'}`}>
              {done ? step.detail : active ? step.detail : 'Queued'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ScoreRevealTransition({ score }: { score: number }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-white/15 bg-white/5 p-4">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      <div className="relative z-10 flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">Estimated Health</p>
          <p className="mt-1 text-sm font-medium text-white">Diagnostic complete</p>
        </div>
        <p className="font-mono text-4xl tracking-tight text-white">
          {score}
          <span className="text-lg opacity-50">%</span>
        </p>
      </div>
    </div>
  );
}

export function ScanProgressPanel({
  progress,
  activeStep,
  completedCount,
  completed,
  finalScore
}: {
  progress: number;
  activeStep: number;
  completedCount: number;
  completed: boolean;
  finalScore?: number | null;
}) {
  const score = scoreForProgress(progress, finalScore);

  return (
    <section className="relative flex w-full flex-col bg-black/10 md:w-[420px]">
      <div className="variant-active-beam" />

      <div className="relative z-10 p-6 pb-2">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">System Diagnostics</h2>
          <div className="flex items-center gap-2">
            <div className="variant-pulsing-dot" />
            <span className="font-mono text-[10px] text-amber-300">SCANNING</span>
          </div>
        </div>

        <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
          <div className="h-full bg-amber-500 shadow-[0_0_10px_#d97736] transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto p-6 pt-2">
        <DiagnosticStepList activeStep={activeStep} completed={completed} completedCount={completedCount} />
      </div>

      <div className="relative z-10 mt-auto border-t border-white/10 p-6">
        <ScoreRevealTransition score={score} />
      </div>
    </section>
  );
}

export function ScanLoadingShell({
  open,
  websiteUrl,
  city,
  shopName,
  completed,
  finalScore,
  externalStepIndex
}: ScanLoadingShellProps) {
  const [mounted, setMounted] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setActiveStep(0);
    setCompletedCount(0);
    setProgress(8);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || completed || typeof externalStepIndex === 'number') return;

    const interval = setInterval(() => {
      setActiveStep((current) => {
        const next = Math.min(current + 1, STEPS.length - 1);
        setCompletedCount(Math.min(next, STEPS.length - 1));
        setProgress((prev) => Math.max(prev, Math.min(92, 10 + Math.round(((next + 1) / STEPS.length) * 80))));
        return next;
      });
    }, 760);

    return () => clearInterval(interval);
  }, [open, completed, externalStepIndex]);

  useEffect(() => {
    if (!open || typeof externalStepIndex !== 'number') return;
    const safeStep = clamp(externalStepIndex, 0, STEPS.length - 1);
    setActiveStep(safeStep);
    setCompletedCount(safeStep);
    setProgress(Math.min(92, 10 + Math.round(((safeStep + 1) / STEPS.length) * 80)));
  }, [externalStepIndex, open]);

  useEffect(() => {
    if (!open || !completed) return;
    setActiveStep(STEPS.length - 1);
    setCompletedCount(STEPS.length);
    setProgress(100);
  }, [completed, open]);

  const overlay = useMemo(() => {
    if (!open) return null;

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0f0502] text-white">
        <div className="variant-loader-ambient" />
        <div className="variant-loader-blur" />

        <main className="relative z-10 flex h-[640px] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-white/10 bg-[rgba(30,20,15,0.65)] shadow-2xl backdrop-blur-xl md:flex-row">
          <WebsitePreviewDiagnostic websiteUrl={websiteUrl} activeStep={activeStep} completedCount={completedCount} />
          <ScanProgressPanel
            progress={progress}
            activeStep={activeStep}
            completedCount={completedCount}
            completed={completed}
            finalScore={finalScore}
          />
        </main>

        <div className="pointer-events-none absolute left-6 top-6 font-mono text-[10px] uppercase tracking-[0.22em] text-white/25">
          {shopName || 'Collision Shop'} • {city || 'Local Market'}
        </div>
      </div>
    );
  }, [open, websiteUrl, activeStep, completedCount, progress, completed, finalScore, shopName, city]);

  if (!mounted || !overlay) return null;
  return createPortal(overlay, document.body);
}
