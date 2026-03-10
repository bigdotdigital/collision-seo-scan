'use client';

import { useState } from 'react';

type MapPoint = {
  id: string;
  label: string;
  detail: string;
  x: number;
  y: number;
  tone?: 'shop' | 'competitor';
};

type InteractiveMapProps = {
  title?: string;
  points: MapPoint[];
  geographic?: boolean;
};

export function InteractiveMap({
  title = 'Interactive Market Positioning',
  points,
  geographic = false
}: InteractiveMapProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activePoint = points.find((point) => point.id === activeId) || null;

  return (
    <div className="card">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-main)]">{title}</h3>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {geographic
              ? 'Points use stored latitude and longitude when available.'
              : 'Relative positioning view based on known score, review, and competitor-pressure signals.'}
          </p>
        </div>
        <div className="text-xs text-[var(--text-muted)]">
          {geographic ? 'Geo mode' : 'Relative mode'}
        </div>
      </div>

      <div className="relative h-72 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--bg-body)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(156,163,175,0.22)_1px,transparent_0)] bg-[size:24px_24px]" />
        {points.map((point) => (
          <button
            key={point.id}
            type="button"
            className={`absolute flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm ${
              point.tone === 'shop' ? 'bg-[var(--primary)]' : 'bg-[var(--accent-orange)]'
            }`}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            onMouseEnter={() => setActiveId(point.id)}
            onFocus={() => setActiveId(point.id)}
            onMouseLeave={() => setActiveId((current) => (current === point.id ? null : current))}
            aria-label={point.label}
          />
        ))}

        {activePoint ? (
          <div className="absolute right-4 top-4 max-w-[220px] rounded-md border border-[var(--border-color)] bg-[var(--bg-surface)] p-3 shadow-sm">
            <p className="text-sm font-semibold text-[var(--text-main)]">{activePoint.label}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{activePoint.detail}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-[var(--text-secondary)]">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--primary)]" />
          <span>Your shop</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent-orange)]" />
          <span>Competitors</span>
        </div>
      </div>
    </div>
  );
}
