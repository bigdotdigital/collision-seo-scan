'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import Link from 'next/link';
import type { AdminMarketConsoleState } from '@/lib/admin-market-console';
import { ShopIntelDrawer } from './shop-intel-drawer';

type Tone = 'strong' | 'warning' | 'weak' | 'neutral';

const signalToneClasses: Record<Tone, string> = {
  strong: 'bg-[#06b6d4] shadow-[0_0_14px_rgba(6,182,212,0.45)]',
  warning: 'bg-[#f59e0b] shadow-[0_0_12px_rgba(245,158,11,0.28)]',
  weak: 'bg-[#ef4444] shadow-[0_0_12px_rgba(239,68,68,0.25)]',
  neutral: 'bg-[#3b82f6] shadow-[0_0_12px_rgba(59,130,246,0.25)]'
};

const signalTextClasses: Record<Tone, string> = {
  strong: 'text-[#a5f3fc]',
  warning: 'text-[#fde68a]',
  weak: 'text-[#fda4af]',
  neutral: 'text-[#93c5fd]'
};

const signalBgClasses: Record<Tone, string> = {
  strong: 'bg-[rgba(6,182,212,0.14)] border-[#0e7490]/40',
  warning: 'bg-[rgba(245,158,11,0.14)] border-[#b45309]/40',
  weak: 'bg-[rgba(239,68,68,0.14)] border-[#be123c]/40',
  neutral: 'bg-[rgba(59,130,246,0.14)] border-[#1d4ed8]/40'
};

function panelHeader(title: string, right?: React.ReactNode) {
  return (
    <header className="flex items-center justify-between border-b border-[#1e293b] bg-[linear-gradient(180deg,#0f172a_0%,#0a0d14_100%)] px-3 py-1.5">
      <h2 className="text-[11px] font-mono font-bold uppercase tracking-[0.28em] text-[#e2e8f0]">{title}</h2>
      {right}
    </header>
  );
}

function MetricChip(args: { label: string; value: string; delta?: string; tone?: Tone }) {
  return (
    <div className="flex items-center gap-2 border border-[#1e293b] bg-[#0f172a] px-2 py-1 text-[10px] font-mono uppercase tracking-[0.18em]">
      <span className="text-[#94a3b8]">{args.label}</span>
      <span className={`font-bold ${signalTextClasses[args.tone || 'neutral']}`}>{args.value}</span>
      {args.delta ? <span className="text-[8px] text-[#94a3b8]/60">{args.delta}</span> : null}
    </div>
  );
}

function BriefCard(args: { label: string; value: string; detail: string; tone?: Tone }) {
  return (
    <div className={`border p-3 ${signalBgClasses[args.tone || 'neutral']}`}>
      <div className="text-[9px] font-mono uppercase tracking-[0.24em] text-[#94a3b8]">{args.label}</div>
      <div className={`mt-2 text-2xl font-mono font-bold ${signalTextClasses[args.tone || 'neutral']}`}>{args.value}</div>
      <div className="mt-1 text-[10px] font-mono text-[#cbd5e1]">{args.detail}</div>
    </div>
  );
}

function statusPill(label: string, tone: Tone) {
  return (
    <span className={`border px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-[0.18em] ${signalBgClasses[tone]} ${signalTextClasses[tone]}`}>
      {label}
    </span>
  );
}

function TacticalPanel(args: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`overflow-hidden border border-[#1e293b] bg-[rgba(10,13,20,0.88)] backdrop-blur-sm ${args.className || ''}`}>
      {args.children}
    </section>
  );
}

function formatCompact(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function scoreSize(score: number) {
  if (score >= 85) return 'h-3 w-3';
  if (score >= 70) return 'h-2.5 w-2.5';
  if (score >= 50) return 'h-2 w-2';
  return 'h-1.5 w-1.5';
}

function lineTone(tone: Tone) {
  if (tone === 'strong') return '#06b6d4';
  if (tone === 'warning') return '#f59e0b';
  if (tone === 'weak') return '#ef4444';
  return '#3b82f6';
}

function MapPoint(args: {
  point: AdminMarketConsoleState['map']['points'][number];
  active: boolean;
  onHover: (shopId: string | null) => void;
  onSelect: (shopId: string) => void;
}) {
  return (
    <button
      type="button"
      onMouseEnter={() => args.onHover(args.point.shopId)}
      onMouseLeave={() => args.onHover(null)}
      onFocus={() => args.onHover(args.point.shopId)}
      onBlur={() => args.onHover(null)}
      onClick={() => args.onSelect(args.point.shopId)}
      className={`absolute -translate-x-1/2 -translate-y-1/2 border z-20 transition-all duration-150 hover:scale-150 ${
        signalToneClasses[args.point.tone]
      } ${scoreSize(args.point.score)} ${args.active ? 'scale-150 border-white' : 'border-white/60'}`}
      style={{ left: `${args.point.x}%`, top: `${args.point.y}%` }}
      title={`${args.point.name} · SEO ${args.point.score}`}
    >
      <span className="sr-only">{args.point.name}</span>
    </button>
  );
}

function EmptyState(args: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center text-[11px] font-mono uppercase tracking-[0.24em] text-[#64748b]">
      {args.label}
    </div>
  );
}

export function MarketConsole(args: { state: AdminMarketConsoleState }) {
  const [activeShopId, setActiveShopId] = useState(args.state.drawer.defaultShopId);
  const [hoveredShopId, setHoveredShopId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedPresence, setSelectedPresence] = useState<'all' | 'missing-site' | 'missing-maps' | 'hidden-operators' | 'published-only'>('all');
  const deferredSearch = useDeferredValue(search);
  const activeShop = activeShopId ? args.state.drawer.shops[activeShopId] || null : null;
  const hoveredPoint = useMemo(
    () => args.state.map.points.find((point) => point.shopId === hoveredShopId) || null,
    [args.state.map.points, hoveredShopId]
  );
  const explorerRows = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    return args.state.explorer.rows.filter((row) => {
      if (selectedCity !== 'all' && row.city !== selectedCity) return false;
      if (selectedPresence === 'missing-site' && row.websiteStatus !== 'no-site') return false;
      if (selectedPresence === 'missing-maps' && row.googleStatus !== 'no-maps') return false;
      if (selectedPresence === 'hidden-operators' && row.hiddenOperatorScore < 40) return false;
      if (selectedPresence === 'published-only' && row.publishedStatus !== 'published') return false;
      if (!term) return true;
      const haystack = `${row.name} ${row.city} ${row.typeLabel}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [args.state.explorer.rows, deferredSearch, selectedCity, selectedPresence]);

  return (
    <>
      <main className="min-h-screen bg-[#05070a] text-[#94a3b8]">
        <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-[#1e293b] bg-[#0a0d14] px-4 font-mono text-xs shadow-md">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse bg-[#06b6d4] shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              <h1 className="text-sm font-bold uppercase tracking-[0.32em] text-[#e2e8f0]">
                {args.state.market.city} Market Intel
              </h1>
              <span className="ml-2 text-[10px] uppercase tracking-[0.22em] text-[#64748b]">
                /admin/markets/{args.state.market.slug}
              </span>
            </div>

            <nav className="hidden gap-6 text-[10px] uppercase tracking-[0.26em] text-[#94a3b8] lg:flex">
              {args.state.nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    item.active
                      ? 'translate-y-[2px] border-b-2 border-[#06b6d4] pb-4 text-[#e2e8f0]'
                      : 'translate-y-[2px] pb-4 transition-colors hover:text-[#e2e8f0]'
                  }
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <MetricChip label="Total Shops" value={String(args.state.metrics.totalShops)} tone="strong" />
            <MetricChip label="Observations" value={formatCompact(args.state.metrics.totalObservations)} tone="neutral" />
            <MetricChip label="Queue Today" value={String(args.state.metrics.queueToday)} tone="warning" />
            <MetricChip
              label="Median Runtime"
              value={args.state.metrics.medianRuntimeMs ? `${Math.round(args.state.metrics.medianRuntimeMs / 1000)}s` : 'n/a'}
              tone="neutral"
            />
            <div className="border-l border-[#1e293b] pl-3 text-[10px] uppercase tracking-[0.2em] text-[#64748b]">
              Updated: {args.state.metrics.updatedAtLabel}
            </div>
          </div>
        </header>

        <div className="bg-[#05070a] bg-[linear-gradient(rgba(14,27,46,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(14,27,46,0.6)_1px,transparent_1px)] bg-[size:24px_24px] bg-[-1px_-1px] p-3">
          <div className="mx-auto grid max-w-[1920px] grid-cols-12 auto-rows-min gap-3 pb-8">
            <TacticalPanel className="col-span-12">
              {panelHeader(
                'Market Brief',
                <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-[#94a3b8]">
                  Real Denver market coverage from Google + website scans
                </div>
              )}
              <div className="grid gap-3 bg-[#0a0d14] p-3 lg:grid-cols-[1.2fr_0.9fr_0.9fr]">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <BriefCard
                    label="Website Coverage"
                    value={formatPercent(args.state.marketBrief.websiteCoveragePct)}
                    detail={`${args.state.metrics.totalShops} canonical shops in current Denver slice`}
                    tone="strong"
                  />
                  <BriefCard
                    label="Google Coverage"
                    value={formatPercent(args.state.marketBrief.googleCoveragePct)}
                    detail="Canonical shops with maps/profile signal"
                    tone="neutral"
                  />
                  <BriefCard
                    label="Published Reports"
                    value={formatPercent(args.state.marketBrief.publishedPct)}
                    detail={`${args.state.integrity.publishedCount} public pages live`}
                    tone="warning"
                  />
                  <BriefCard
                    label="Avg Reviews"
                    value={String(args.state.marketBrief.avgReviewCount)}
                    detail="Google-weighted review density across the market"
                    tone="neutral"
                  />
                  <BriefCard
                    label="High Signal Shops"
                    value={String(args.state.marketBrief.highSignalCount)}
                    detail="Shops showing strong current market signal"
                    tone="strong"
                  />
                  <BriefCard
                    label="Hidden Operators"
                    value={String(args.state.marketBrief.hiddenOperatorCount)}
                    detail="Strong reputation without strong site visibility"
                    tone="warning"
                  />
                </div>

                <div className="space-y-2 border border-[#1e293b] bg-[#081018] p-3">
                  <div className="text-[9px] font-mono uppercase tracking-[0.24em] text-[#94a3b8]">City Hotspots</div>
                  {args.state.marketBrief.cityHotspots.map((row) => (
                    <button
                      key={row.city}
                      type="button"
                      className="grid w-full grid-cols-[1fr_auto_auto] gap-3 border border-[#1e293b] bg-[#0f172a] px-3 py-2 text-left font-mono transition hover:bg-slate-900"
                    >
                      <div>
                        <div className="text-[11px] text-[#e2e8f0]">{row.city}</div>
                        <div className="mt-1 text-[10px] text-[#94a3b8]">
                          {row.shopCount} shops · avg score {row.avgScore}
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-[#67e8f9]">{row.avgReviews}</div>
                      <div className="text-right text-[10px] text-[#94a3b8]">
                        <div>{row.strongCount} strong</div>
                        <div className="text-[#fb7185]">{row.weakCount} weak</div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="space-y-2 border border-[#1e293b] bg-[#081018] p-3">
                  <div className="text-[9px] font-mono uppercase tracking-[0.24em] text-[#94a3b8]">Market Watchlist</div>
                  {args.state.marketBrief.watchlist.length ? (
                    args.state.marketBrief.watchlist.map((row) => (
                      <button
                        key={`${row.shopId}-${row.label}`}
                        type="button"
                        onClick={() => setActiveShopId(row.shopId)}
                        className="w-full border border-[#1e293b] bg-[#0f172a] px-3 py-2 text-left font-mono transition hover:bg-slate-900"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[11px] text-[#e2e8f0]">{row.name}</div>
                            <div className="mt-1 text-[9px] uppercase tracking-[0.18em] text-[#94a3b8]">
                              {row.city} · {row.label}
                            </div>
                          </div>
                          <span className={`mt-0.5 h-2 w-2 ${signalToneClasses[row.tone]}`} />
                        </div>
                        <div className="mt-2 text-[10px] text-[#cbd5e1]">{row.detail}</div>
                      </button>
                    ))
                  ) : (
                    <div className="border border-[#1e293b] bg-[#0f172a] px-3 py-2 text-[11px] font-mono text-[#64748b]">
                      No urgent market watch items in the current slice.
                    </div>
                  )}
                </div>
              </div>
            </TacticalPanel>

            <TacticalPanel className="col-span-12 lg:col-span-8">
              {panelHeader(
                'Denver Metro Market Map',
                <div className="flex gap-3 font-mono text-[9px] uppercase tracking-[0.26em] text-[#94a3b8]">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 bg-[#06b6d4]" />
                    Strong SEO
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 bg-[#f59e0b]" />
                    Avg SEO
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 bg-[#ef4444]" />
                    Weak SEO
                  </span>
                </div>
              )}
              <div className="relative h-[450px] overflow-hidden border-t border-[#1e293b] bg-[#020408] p-2">
                <svg className="absolute inset-0 h-full w-full opacity-30 pointer-events-none" viewBox="0 0 1000 500" preserveAspectRatio="none">
                  <path d="M-100 250 Q 200 100 500 300 T 1100 200" fill="none" stroke="#1e293b" strokeWidth="1" />
                  <path d="M-50 400 Q 300 200 600 450 T 1100 100" fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="4" />
                  <path d="M200 -50 Q 300 200 150 550" fill="none" stroke="#0f172a" strokeWidth="2" />
                  <path d="M800 -50 Q 700 250 850 550" fill="none" stroke="#0f172a" strokeWidth="2" />
                  <circle cx="500" cy="250" r="200" fill="none" stroke="#06b6d4" strokeOpacity="0.1" strokeWidth="1" />
                  <circle cx="500" cy="250" r="400" fill="none" stroke="#06b6d4" strokeOpacity="0.05" strokeWidth="1" />
                  <path d="M500 250 L500 -150" fill="none" stroke="#06b6d4" strokeOpacity="0.2" strokeWidth="1">
                    <animateTransform attributeName="transform" type="rotate" from="0 500 250" to="360 500 250" dur="4s" repeatCount="indefinite" />
                  </path>
                </svg>

                {args.state.map.points.map((point) => (
                  <MapPoint
                    key={point.shopId}
                    point={point}
                    active={point.shopId === activeShopId}
                    onHover={setHoveredShopId}
                    onSelect={setActiveShopId}
                  />
                ))}

                {hoveredPoint ? (
                  <div className="absolute left-3 top-3 min-w-[180px] border border-[#334155] bg-[#0f172a] p-2 shadow-xl">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <span className="text-xs font-mono font-bold text-[#e2e8f0]">{hoveredPoint.name}</span>
                      <span className="border border-[#334155] px-1 text-[8px] uppercase text-[#94a3b8]">{hoveredPoint.typeLabel}</span>
                    </div>
                    <div className="mb-2 text-[9px] font-mono uppercase text-[#94a3b8]">
                      {hoveredPoint.city}, CO
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs font-mono">
                      <div>
                        <span className="font-bold text-[#e2e8f0]">{hoveredPoint.reviews.toLocaleString()}</span>{' '}
                        <span className="text-[9px] text-[#94a3b8]">revs</span>
                      </div>
                      <div>
                        <span className={`font-bold ${signalTextClasses[hoveredPoint.tone]}`}>{hoveredPoint.score}</span>{' '}
                        <span className="text-[9px] text-[#94a3b8]">SEO</span>
                      </div>
                    </div>
                    <div className="mt-2 border-t border-[#1e293b] pt-1 text-[8px] uppercase tracking-[0.2em] text-[#94a3b8]">
                      Scan: {hoveredPoint.scanAgeLabel}
                    </div>
                  </div>
                ) : null}

                <div className="absolute left-2 top-2 text-[9px] font-mono uppercase text-[#94a3b8]/80">
                  Sector: DEN-ALPHA | Zoom: 12x | Grid: 24m²
                </div>
                <div className="absolute bottom-2 right-2 flex items-center gap-2 text-[9px] font-mono uppercase text-[#94a3b8]">
                  <span className="flex items-center gap-1">
                    <span className="h-1 w-1 bg-[#94a3b8]/40" />
                    Scan Age: {args.state.map.averageScanAgeHours}
                  </span>
                  <span>|</span>
                  <span>Coord: 39°44&apos;21&quot;N 104°59&apos;5&quot;W</span>
                </div>
              </div>
            </TacticalPanel>

            <TacticalPanel className="col-span-12 lg:col-span-4">
              {panelHeader(
                'Top Shops Leaderboard',
                <span className="cursor-pointer border border-[#334155] bg-[#1e293b] px-1.5 py-0.5 text-[9px] font-mono uppercase text-[#94a3b8] transition hover:bg-slate-700">
                  Export.CSV
                </span>
              )}
              <div className="max-h-[450px] overflow-auto bg-[#0a0d14]">
                <table className="w-full border-collapse whitespace-nowrap text-left">
                  <thead className="sticky top-0 z-10 border-b border-[#1e293b] bg-[#0f172a] text-[9px] font-mono uppercase tracking-[0.22em] text-[#94a3b8]">
                    <tr>
                      <th className="w-8 px-2 py-2 text-center font-normal">Rnk</th>
                      <th className="px-2 py-2 font-normal">Entity Name</th>
                      <th className="px-2 py-2 font-normal">City</th>
                      <th className="px-2 py-2 text-right font-normal">Rev</th>
                      <th className="w-12 px-2 py-2 text-right font-normal">SEO</th>
                      <th className="w-12 px-2 py-2 text-center font-normal">Crt</th>
                      <th className="px-2 py-2 text-right font-normal">Last</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b] text-xs font-mono">
                    {args.state.leaderboard.map((row) => (
                      <tr
                        key={row.shopId}
                        className="cursor-pointer transition-all hover:bg-[rgba(30,41,59,0.5)] hover:[box-shadow:inset_2px_0_0_0_#06b6d4]"
                        onClick={() => setActiveShopId(row.shopId)}
                      >
                        <td className="px-2 py-1.5 text-center text-[#94a3b8]">{String(row.rank).padStart(2, '0')}</td>
                        <td className="max-w-[150px] truncate px-2 py-1.5 font-bold text-[#e2e8f0]">{row.name}</td>
                        <td className="px-2 py-1.5 text-[10px] text-[#94a3b8]">
                          {row.city}{' '}
                          <span className="text-[#475569]">•</span>{' '}
                            <span className="uppercase tracking-[0.16em] text-[#94a3b8]">
                            {args.state.drawer.shops[row.shopId]?.typeLabel === 'Chain' ? 'Chain' : 'Indy'}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-right text-[#e2e8f0]">{row.reviews.toLocaleString()}</td>
                        <td className={`border-l px-2 py-1.5 text-right font-bold ${signalTextClasses[row.tone]} ${signalBgClasses[row.tone]} border-[#1e293b]`}>
                          {row.score}
                        </td>
                        <td className="px-2 py-1.5 text-center text-[#94a3b8]">{row.oemCount}</td>
                        <td className="px-2 py-1.5 text-right text-[10px] text-[#94a3b8]">{row.lastScanLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TacticalPanel>

            <TacticalPanel className="col-span-12">
              {panelHeader(
                'Shop Explorer',
                <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-[#94a3b8]">
                  {explorerRows.length} of {args.state.explorer.rows.length} shops visible
                </div>
              )}
              <div className="space-y-3 bg-[#0a0d14] p-3">
                <div className="grid gap-3 lg:grid-cols-[1.3fr_0.8fr_1fr_auto]">
                  <label className="flex items-center gap-2 border border-[#1e293b] bg-[#0f172a] px-3 py-2">
                    <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-[#94a3b8]">Search</span>
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Shop, city, chain"
                      className="w-full bg-transparent text-sm text-[#e2e8f0] outline-none placeholder:text-[#475569]"
                    />
                  </label>

                  <label className="flex items-center gap-2 border border-[#1e293b] bg-[#0f172a] px-3 py-2">
                    <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-[#94a3b8]">City</span>
                    <select
                      value={selectedCity}
                      onChange={(event) => setSelectedCity(event.target.value)}
                      className="w-full bg-transparent text-sm text-[#e2e8f0] outline-none"
                    >
                      <option value="all">All metro</option>
                      {args.state.explorer.cities.map((city) => (
                        <option key={city} value={city} className="bg-[#0f172a]">
                          {city}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center gap-2 border border-[#1e293b] bg-[#0f172a] px-3 py-2">
                    <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-[#94a3b8]">Focus</span>
                    <select
                      value={selectedPresence}
                      onChange={(event) => setSelectedPresence(event.target.value as typeof selectedPresence)}
                      className="w-full bg-transparent text-sm text-[#e2e8f0] outline-none"
                    >
                      <option value="all">All shops</option>
                      <option value="missing-site">No website</option>
                      <option value="missing-maps">No maps signal</option>
                      <option value="hidden-operators">Hidden operators</option>
                      <option value="published-only">Published only</option>
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setSelectedCity('all');
                      setSelectedPresence('all');
                    }}
                    className="border border-[#334155] bg-[#111827] px-3 py-2 text-[10px] font-mono uppercase tracking-[0.22em] text-[#cbd5e1] transition hover:bg-[#1e293b]"
                  >
                    Reset
                  </button>
                </div>

                <div className="grid gap-2 md:grid-cols-4">
                  <div className="border border-[#1e293b] bg-[#081018] px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-[#94a3b8]">
                    No-site shops <span className="ml-2 text-[#fbbf24]">{explorerRows.filter((row) => row.websiteStatus === 'no-site').length}</span>
                  </div>
                  <div className="border border-[#1e293b] bg-[#081018] px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-[#94a3b8]">
                    No-maps shops <span className="ml-2 text-[#60a5fa]">{explorerRows.filter((row) => row.googleStatus === 'no-maps').length}</span>
                  </div>
                  <div className="border border-[#1e293b] bg-[#081018] px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-[#94a3b8]">
                    Hidden operators <span className="ml-2 text-[#67e8f9]">{explorerRows.filter((row) => row.hiddenOperatorScore >= 40).length}</span>
                  </div>
                  <div className="border border-[#1e293b] bg-[#081018] px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-[#94a3b8]">
                    Published <span className="ml-2 text-[#34d399]">{explorerRows.filter((row) => row.publishedStatus === 'published').length}</span>
                  </div>
                </div>

                <div className="max-h-[460px] overflow-auto border border-[#1e293b]">
                  <table className="w-full border-collapse whitespace-nowrap text-left">
                    <thead className="sticky top-0 z-10 border-b border-[#1e293b] bg-[#0f172a] text-[9px] font-mono uppercase tracking-[0.22em] text-[#94a3b8]">
                      <tr>
                        <th className="px-3 py-2 font-normal">Shop</th>
                        <th className="px-3 py-2 font-normal">City</th>
                        <th className="px-3 py-2 text-right font-normal">Reviews</th>
                        <th className="px-3 py-2 text-right font-normal">Score</th>
                        <th className="px-3 py-2 font-normal">Coverage</th>
                        <th className="px-3 py-2 text-right font-normal">Hidden</th>
                        <th className="px-3 py-2 text-right font-normal">Source</th>
                        <th className="px-3 py-2 text-right font-normal">Last</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e293b] bg-[#09101a] text-xs font-mono">
                      {explorerRows.map((row) => (
                        <tr
                          key={row.shopId}
                          className="cursor-pointer transition-all hover:bg-[rgba(30,41,59,0.5)] hover:[box-shadow:inset_2px_0_0_0_#06b6d4]"
                          onClick={() => setActiveShopId(row.shopId)}
                        >
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className={`h-2 w-2 ${signalToneClasses[row.tone]}`} />
                              <div>
                                <div className="text-[#e2e8f0]">{row.name}</div>
                                <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#64748b]">{row.typeLabel}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-[#cbd5e1]">{row.city}</td>
                          <td className="px-3 py-2 text-right text-[#e2e8f0]">{row.reviews.toLocaleString()}</td>
                          <td className={`px-3 py-2 text-right font-bold ${signalTextClasses[row.tone]}`}>{row.score}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              {statusPill(row.websiteStatus, row.websiteStatus === 'site' ? 'strong' : 'warning')}
                              {statusPill(row.googleStatus, row.googleStatus === 'maps' ? 'neutral' : 'weak')}
                              {statusPill(row.publishedStatus, row.publishedStatus === 'published' ? 'strong' : 'weak')}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right text-[#67e8f9]">{row.hiddenOperatorScore.toFixed(1)}</td>
                          <td className="px-3 py-2 text-right text-[#fbbf24]">{row.sourceCoverageScore.toFixed(1)}</td>
                          <td className="px-3 py-2 text-right text-[#94a3b8]">{row.lastScanLabel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!explorerRows.length ? (
                    <div className="border-t border-[#1e293b] bg-[#0f172a] px-3 py-6 text-center text-[11px] font-mono uppercase tracking-[0.22em] text-[#64748b]">
                      No shops match the current filters.
                    </div>
                  ) : null}
                </div>
              </div>
            </TacticalPanel>

            <TacticalPanel className="col-span-12 md:col-span-4">
              {panelHeader(
                'Weak SEO / High Authority Targets',
                <span className="border border-[#06b6d4]/50 bg-[rgba(6,182,212,0.15)] px-1.5 py-0.5 text-[9px] font-mono uppercase text-[#67e8f9]">
                  Priority
                </span>
              )}
              <div className="max-h-[300px] overflow-auto bg-[#0a0d14]">
                <table className="w-full whitespace-nowrap text-left">
                  <thead className="sticky top-0 z-10 border-b border-[#1e293b] bg-[#0f172a] text-[9px] font-mono uppercase tracking-[0.22em] text-[#94a3b8]">
                    <tr>
                      <th className="px-2 py-2 font-normal">Entity</th>
                      <th className="px-2 py-2 text-right font-normal">Rev</th>
                      <th className="px-2 py-2 text-right font-normal">SEO</th>
                      <th className="px-2 py-2 text-right font-normal">Missing</th>
                      <th className="px-2 py-2 text-right font-normal">Opp Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b] text-xs font-mono">
                    {args.state.opportunities.map((row) => (
                      <tr
                        key={row.shopId}
                        className="cursor-pointer transition-all hover:bg-[rgba(30,41,59,0.5)] hover:[box-shadow:inset_2px_0_0_0_#06b6d4]"
                        onClick={() => setActiveShopId(row.shopId)}
                      >
                        <td className="max-w-[160px] truncate px-2 py-1.5 font-bold text-[#e2e8f0]">{row.name}</td>
                        <td className="px-2 py-1.5 text-right text-[#e2e8f0]">{row.reviews.toLocaleString()}</td>
                        <td className="px-2 py-1.5 text-right text-[#fb7185]">{row.score}</td>
                        <td className="px-2 py-1.5 text-right text-[#94a3b8]">{row.missingCount}</td>
                        <td className="px-2 py-1.5 text-right font-bold text-[#67e8f9]">{row.opportunityScore.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TacticalPanel>

            <TacticalPanel className="col-span-12 md:col-span-4">
              {panelHeader(
                'Competitor Topology',
                <div className="flex gap-2">
                  <span className="h-1.5 w-1.5 bg-[#06b6d4] shadow-[0_0_4px_#06b6d4]" />
                  <span className="h-1.5 w-1.5 bg-[#f59e0b] shadow-[0_0_4px_#f59e0b]" />
                  <span className="h-1.5 w-1.5 bg-[#3b82f6] shadow-[0_0_4px_#3b82f6]" />
                </div>
              )}
              <div className="relative flex h-[300px] items-center justify-center overflow-hidden border-t border-[#1e293b] bg-[#020408]">
                {args.state.topology.nodes.length ? (
                  <svg width="100%" height="100%" viewBox="0 0 300 200" className="overflow-visible">
                    {args.state.topology.edges.map((edge) => {
                      const source = args.state.topology.nodes.find((node) => node.id === edge.sourceId);
                      const target = args.state.topology.nodes.find((node) => node.id === edge.targetId);
                      if (!source || !target) return null;
                      return (
                        <line
                          key={`${edge.sourceId}-${edge.targetId}`}
                          x1={source.x * 3}
                          y1={source.y * 2}
                          x2={target.x * 3}
                          y2={target.y * 2}
                          stroke="#1e293b"
                          strokeWidth="1"
                        />
                      );
                    })}
                    {args.state.topology.nodes.map((node) => (
                      <g key={node.id} onClick={() => setActiveShopId(node.id)} className="cursor-pointer">
                        <circle
                          cx={node.x * 3}
                          cy={node.y * 2}
                          r={node.radius}
                          fill="#0f172a"
                          stroke={lineTone(node.tone)}
                          strokeWidth={node.radius >= 14 ? '2' : '1.5'}
                        />
                        <text
                          x={node.x * 3}
                          y={node.y * 2 + 3}
                          fill={node.radius >= 14 ? '#e2e8f0' : '#64748b'}
                          fontSize={node.radius >= 14 ? '9' : '7'}
                          fontFamily="monospace"
                          textAnchor="middle"
                          fontWeight={node.radius >= 14 ? 'bold' : 'normal'}
                        >
                          {node.shortLabel}
                        </text>
                      </g>
                    ))}
                  </svg>
                ) : (
                  <EmptyState label="No competitor topology recorded yet" />
                )}
                  <div className="absolute bottom-1 left-2 text-[9px] font-mono uppercase text-[#94a3b8]">
                  Nodes: Rev | Edges: Competitor Overlap
                </div>
              </div>
            </TacticalPanel>

            <TacticalPanel className="col-span-12 md:col-span-4">
              {panelHeader(
                'Review Velocity (90d)',
                <div className="flex border border-[#1e293b] bg-[#0f172a] text-[9px] font-mono uppercase">
                  <span className="bg-[#1e293b] px-2 py-0.5 text-white">Top 10</span>
                  <span className="px-2 py-0.5 text-[#64748b]">vs Comp</span>
                </div>
              )}
              <div className="relative h-[300px] bg-[#0a0d14] p-3">
                <div className="absolute bottom-6 left-2 top-4 flex flex-col justify-between text-[9px] font-mono text-[#94a3b8]">
                  <span>{formatCompact(args.state.reviewVelocity.yMax)}</span>
                  <span>{formatCompact(args.state.reviewVelocity.yMax * 0.66)}</span>
                  <span>{formatCompact(args.state.reviewVelocity.yMax * 0.33)}</span>
                  <span>0</span>
                </div>
                <div className="absolute bottom-1 left-8 right-2 flex justify-between text-[9px] font-mono uppercase text-[#94a3b8]">
                  <span>-90d</span>
                  <span>-60d</span>
                  <span>-30d</span>
                  <span>Now</span>
                </div>
                <div className="ml-6 h-full w-[calc(100%-1.5rem)]">
                  {args.state.reviewVelocity.series.length ? (
                    <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100" className="overflow-visible">
                      <line x1="0" y1="0" x2="100" y2="0" stroke="#1e293b" strokeWidth="0.5" />
                      <line x1="0" y1="33" x2="100" y2="33" stroke="#1e293b" strokeWidth="0.5" />
                      <line x1="0" y1="66" x2="100" y2="66" stroke="#1e293b" strokeWidth="0.5" />
                      <line x1="0" y1="100" x2="100" y2="100" stroke="#334155" strokeWidth="1" />
                      {args.state.reviewVelocity.series.map((series) => (
                        <polyline
                          key={series.shopId}
                          points={series.points.map((point) => `${point.x},${point.y}`).join(' ')}
                          fill="none"
                          stroke={lineTone(series.tone)}
                          strokeWidth={series.tone === 'strong' ? '2' : '1.4'}
                          strokeDasharray={series.tone === 'warning' ? '2,2' : undefined}
                        />
                      ))}
                    </svg>
                  ) : (
                    <EmptyState label="No review velocity series available" />
                  )}
                </div>
              </div>
            </TacticalPanel>

            <TacticalPanel className="col-span-12 md:col-span-4">
              {panelHeader('OEM Cert Coverage Matrix')}
              <div className="space-y-2.5 bg-[#0a0d14] p-3">
                {args.state.oemMatrix.map((row) => (
                  <div key={row.label} className="grid grid-cols-[60px_1fr_44px] items-center gap-3 text-xs font-mono">
                    <span className="text-[10px] uppercase text-[#e2e8f0]">{row.label}</span>
                    <div className="flex h-1.5 overflow-hidden border border-[#1e293b] bg-[#0f172a]">
                      <div className="bg-[#3b82f6]" style={{ width: `${row.foundPercent}%` }} />
                      <div className="bg-[#ef4444]/80" style={{ width: `${row.gapPercent}%` }} />
                    </div>
                    <span className="text-right text-[10px] text-[#94a3b8]">
                      {row.foundCount} / <span className="text-[#fb7185]">{row.gapCount}</span>
                    </span>
                  </div>
                ))}
                <div className="mt-3 flex justify-between border-t border-[#1e293b] pt-2 text-[9px] font-mono uppercase text-[#64748b]">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 bg-[#3b82f6]" />
                    Found
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 bg-[#ef4444]" />
                    Missing Pgs
                  </span>
                </div>
              </div>
            </TacticalPanel>

            <TacticalPanel className="col-span-12 md:col-span-4">
              {panelHeader(
                'System Operations',
                <div className="h-1.5 w-1.5 animate-pulse bg-[#06b6d4] shadow-[0_0_6px_#06b6d4]" />
              )}
              <div className="flex h-full flex-col gap-3 bg-[#0a0d14] p-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="border border-[#1e293b] bg-[#0f172a] p-2">
                    <div className="mb-1 text-[8px] font-mono uppercase tracking-[0.22em] text-[#64748b]">Queued Jobs</div>
                    <div className="text-sm font-mono font-bold text-[#fbbf24]">{args.state.systemOperations.queuedJobs}</div>
                  </div>
                  <div className="border border-[#1e293b] bg-[#0f172a] p-2">
                    <div className="mb-1 text-[8px] font-mono uppercase tracking-[0.22em] text-[#64748b]">Running Jobs</div>
                    <div className="text-sm font-mono font-bold text-[#60a5fa]">{args.state.systemOperations.runningJobs}</div>
                  </div>
                  <div className="border border-[#1e293b] bg-[#0f172a] p-2">
                    <div className="mb-1 text-[8px] font-mono uppercase tracking-[0.22em] text-[#64748b]">Error Rate(1h)</div>
                    <div className="text-sm font-mono font-bold text-[#67e8f9]">{args.state.systemOperations.errorRate1h}</div>
                  </div>
                </div>
                <div className="relative flex-1 overflow-hidden border border-[#1e293b] bg-[#020408] p-1">
                  <div className="absolute left-1 top-1 z-10 text-[8px] font-mono uppercase text-[#64748b]">Queue Activity (24h)</div>
                  <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100" className="absolute inset-0 pt-4">
                    <defs>
                      <linearGradient id="qGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d={`M0,100 L${args.state.systemOperations.recentQueueActivity
                        .map((value, index, list) => {
                          const x = (index / Math.max(1, list.length - 1)) * 100;
                          const max = Math.max(1, ...list);
                          const y = 95 - (value / max) * 80;
                          return `${x},${y}`;
                        })
                        .join(' L')} L100,100 Z`}
                      fill="url(#qGrad)"
                    />
                    <polyline
                      points={args.state.systemOperations.recentQueueActivity
                        .map((value, index, list) => {
                          const x = (index / Math.max(1, list.length - 1)) * 100;
                          const max = Math.max(1, ...list);
                          const y = 95 - (value / max) * 80;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="1"
                    />
                  </svg>
                </div>
                <div className="flex justify-between text-[9px] font-mono uppercase text-[#64748b]">
                  <span>
                    Workers: <span className="text-[#67e8f9]">{args.state.systemOperations.workerStatus}</span>
                  </span>
                  <span>
                    Deploy: <span className="text-[#e2e8f0]">live</span>
                  </span>
                </div>
              </div>
            </TacticalPanel>

            <TacticalPanel className="col-span-12">
              {panelHeader('Digital Presence Coverage')}
              <div className="grid gap-3 bg-[#0a0d14] p-3 lg:grid-cols-3">
                <div className="space-y-3">
                  <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-[#94a3b8]">Coverage Totals</div>
                  <div className="grid grid-cols-2 gap-2">
                    {args.state.sourceCoverage.totals.map((item) => (
                      <div key={item.label} className="border border-[#1e293b] bg-[#0f172a] p-2">
                        <div className="text-[8px] font-mono uppercase tracking-[0.22em] text-[#94a3b8]">{item.label}</div>
                        <div className="mt-1 text-lg font-mono font-bold text-[#67e8f9]">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-[#94a3b8]">Hidden Operators</div>
                  {args.state.sourceCoverage.hiddenOperators.length ? (
                    args.state.sourceCoverage.hiddenOperators.map((row) => (
                      <button
                        key={row.shopId}
                        type="button"
                        onClick={() => setActiveShopId(row.shopId)}
                        className="grid w-full grid-cols-[1fr_auto_auto] gap-3 border border-[#1e293b] bg-[#0f172a] px-3 py-2 text-left text-[11px] font-mono transition hover:bg-slate-900"
                      >
                        <div>
                          <div className="text-[#e2e8f0]">{row.name}</div>
                          <div className="mt-1 text-[#94a3b8]">
                            {row.city} • {row.typeLabel}
                          </div>
                        </div>
                        <div className="text-[#e2e8f0]">{row.reviews} rev</div>
                        <div className="text-[#67e8f9]">{row.hiddenOperatorScore.toFixed(1)}</div>
                      </button>
                    ))
                  ) : (
                    <div className="border border-[#1e293b] bg-[#0f172a] px-3 py-2 text-[11px] font-mono text-[#64748b]">
                      No hidden operators detected in this slice yet.
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-[#94a3b8]">Source Coverage Gaps</div>
                  {args.state.sourceCoverage.gaps.length ? (
                    args.state.sourceCoverage.gaps.map((row) => (
                      <button
                        key={row.shopId}
                        type="button"
                        onClick={() => setActiveShopId(row.shopId)}
                        className="grid w-full grid-cols-[1fr_auto] gap-3 border border-[#1e293b] bg-[#0f172a] px-3 py-2 text-left text-[11px] font-mono transition hover:bg-slate-900"
                      >
                        <div>
                          <div className="text-[#e2e8f0]">{row.name}</div>
                          <div className="mt-1 flex gap-2 text-[#94a3b8]">
                            <span>{row.reviews} rev</span>
                            <span>{row.hasWebsite ? 'site' : 'no-site'}</span>
                            <span>{row.hasGoogleProfile ? 'maps' : 'no-maps'}</span>
                            <span>{row.hasCarwise ? 'carwise' : 'no-carwise'}</span>
                          </div>
                        </div>
                        <div className="text-[#fbbf24]">{row.sourceCoverageScore.toFixed(1)}</div>
                      </button>
                    ))
                  ) : (
                    <div className="border border-[#1e293b] bg-[#0f172a] px-3 py-2 text-[11px] font-mono text-[#64748b]">
                      No source coverage gaps stand out yet.
                    </div>
                  )}
                </div>
              </div>
            </TacticalPanel>

            <TacticalPanel className="col-span-12">
              {panelHeader(
                'Integrity Watch',
                <div className="flex items-center gap-3 text-[9px] font-mono uppercase tracking-[0.22em] text-[#64748b]">
                  <span>
                    Published <span className="text-[#67e8f9]">{args.state.integrity.publishedCount}</span>
                  </span>
                  <span>
                    Private <span className="text-[#e2e8f0]">{args.state.integrity.privateCount}</span>
                  </span>
                </div>
              )}
              <div className="grid gap-3 bg-[#0a0d14] p-3 lg:grid-cols-3">
                <div className="space-y-2">
                  <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-[#94a3b8]">Duplicate Warnings</div>
                  {args.state.integrity.duplicateWarnings.length ? (
                    args.state.integrity.duplicateWarnings.map((row) => (
                      <div key={row.host} className="border border-[#1e293b] bg-[#0f172a] px-3 py-2 text-[11px] font-mono">
                        <div className="text-[#e2e8f0]">{row.host}</div>
                        <div className="mt-1 text-[#94a3b8]">
                          {row.shopCount} shops · {row.cities.join(', ')}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="border border-[#1e293b] bg-[#0f172a] px-3 py-2 text-[11px] font-mono text-[#64748b]">
                      No host-level duplicate warnings in this market slice.
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-[#94a3b8]">Chain Clusters</div>
                  {args.state.integrity.chainClusters.length ? (
                    args.state.integrity.chainClusters.map((row) => (
                      <div key={row.label} className="grid grid-cols-[1fr_auto_auto] gap-3 border border-[#1e293b] bg-[#0f172a] px-3 py-2 text-[11px] font-mono">
                        <div className="text-[#e2e8f0]">{row.label}</div>
                        <div className="text-[#94a3b8]">{row.locationCount} loc</div>
                        <div className="text-[#67e8f9]">{row.avgScore}</div>
                      </div>
                    ))
                  ) : (
                    <div className="border border-[#1e293b] bg-[#0f172a] px-3 py-2 text-[11px] font-mono text-[#64748b]">
                      No chain clusters detected yet.
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-[#94a3b8]">Suspicious Scans</div>
                  {args.state.integrity.suspiciousScans.length ? (
                    args.state.integrity.suspiciousScans.map((row) => (
                      <button
                        key={row.shopId}
                        type="button"
                        onClick={() => setActiveShopId(row.shopId)}
                        className="grid w-full grid-cols-[1fr_auto] gap-3 border border-[#1e293b] bg-[#0f172a] px-3 py-2 text-left text-[11px] font-mono transition hover:bg-slate-900"
                      >
                        <div>
                          <div className="text-[#e2e8f0]">{row.name}</div>
                          <div className="mt-1 text-[#94a3b8]">{row.reason}</div>
                        </div>
                        <div className="text-[#fb7185]">{row.score}</div>
                      </button>
                    ))
                  ) : (
                    <div className="border border-[#1e293b] bg-[#0f172a] px-3 py-2 text-[11px] font-mono text-[#64748b]">
                      No suspicious completed scans detected.
                    </div>
                  )}
                </div>
              </div>
            </TacticalPanel>
          </div>
        </div>
      </main>

      <ShopIntelDrawer open={Boolean(activeShop)} shop={activeShop} onClose={() => setActiveShopId(null)} />
    </>
  );
}
