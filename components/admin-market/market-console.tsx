'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { AdminMarketConsoleState } from '@/lib/admin-market-console';
import { ShopIntelDrawer } from './shop-intel-drawer';

function panelTitle(title: string, right?: React.ReactNode) {
  return (
    <header className="flex items-center justify-between border-b border-slate-800 bg-gradient-to-b from-slate-900 to-[#0a0d14] px-3 py-2">
      <h2 className="text-xs font-mono font-semibold uppercase tracking-[0.24em] text-slate-100">{title}</h2>
      {right}
    </header>
  );
}

function toneClasses(tone: 'strong' | 'warning' | 'weak' | 'neutral') {
  if (tone === 'strong') return 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.6)]';
  if (tone === 'warning') return 'bg-amber-400';
  if (tone === 'weak') return 'bg-rose-500';
  return 'bg-blue-400';
}

function lineTone(tone: 'strong' | 'warning' | 'weak' | 'neutral') {
  if (tone === 'strong') return '#22d3ee';
  if (tone === 'warning') return '#f59e0b';
  if (tone === 'weak') return '#ef4444';
  return '#60a5fa';
}

function ScoreNode(args: {
  point: AdminMarketConsoleState['map']['points'][number];
  onSelect: (shopId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => args.onSelect(args.point.shopId)}
      className={`absolute h-3 w-3 border border-white/70 transition-transform hover:scale-125 ${toneClasses(args.point.tone)}`}
      style={{ left: `${args.point.x}%`, top: `${args.point.y}%` }}
      title={`${args.point.name} · ${args.point.score}`}
    >
      <span className="sr-only">{args.point.name}</span>
    </button>
  );
}

export function MarketConsole(args: { state: AdminMarketConsoleState }) {
  const [activeShopId, setActiveShopId] = useState(args.state.drawer.defaultShopId);
  const activeShop = activeShopId ? args.state.drawer.shops[activeShopId] || null : null;

  return (
    <>
      <main className="min-h-screen bg-[#05070a] text-slate-300">
        <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-slate-800 bg-[#0a0d14] px-4 shadow-md">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
              <h1 className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-100">
                {args.state.market.city} Market Intel
              </h1>
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
                /admin/markets/{args.state.market.slug}
              </span>
            </div>
            <nav className="hidden gap-6 font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500 md:flex">
              {args.state.nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={item.active ? 'border-b-2 border-cyan-400 pb-3 text-slate-100' : 'pb-3 transition hover:text-slate-100'}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em]">
            <div className="border border-slate-800 bg-slate-900 px-2 py-1">
              <span className="text-slate-500">Total Shops</span>{' '}
              <span className="font-semibold text-cyan-300">{args.state.metrics.totalShops}</span>
            </div>
            <div className="border border-slate-800 bg-slate-900 px-2 py-1">
              <span className="text-slate-500">Observations</span>{' '}
              <span className="font-semibold text-slate-100">
                {Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(
                  args.state.metrics.totalObservations
                )}
              </span>
            </div>
            <div className="border border-slate-800 bg-slate-900 px-2 py-1">
              <span className="text-slate-500">Queue Today</span>{' '}
              <span className="font-semibold text-amber-300">{args.state.metrics.queueToday}</span>
            </div>
            <div className="border border-slate-800 bg-slate-900 px-2 py-1">
              <span className="text-slate-500">Median Runtime</span>{' '}
              <span className="font-semibold text-slate-100">
                {args.state.metrics.medianRuntimeMs ? `${Math.round(args.state.metrics.medianRuntimeMs / 1000)}s` : 'n/a'}
              </span>
            </div>
            <div className="border-l border-slate-800 pl-3 text-slate-500">{args.state.metrics.updatedAtLabel}</div>
          </div>
        </header>

        <div className="bg-[linear-gradient(rgba(14,27,46,0.45)_1px,transparent_1px),linear-gradient(90deg,rgba(14,27,46,0.45)_1px,transparent_1px)] bg-[size:24px_24px] p-3">
          <div className="mx-auto grid max-w-[1920px] grid-cols-12 gap-3 pb-8">
            <section className="col-span-12 lg:col-span-8">
              <div className="overflow-hidden border border-slate-800 bg-[rgba(10,13,20,0.88)]">
                {panelTitle('Denver Metro Market Map', <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">{args.state.map.averageScanAgeHours}</span>)}
                <div className="relative h-[450px] overflow-hidden border-t border-slate-800 bg-[#020408]">
                  <div className="absolute inset-0 opacity-30">
                    <div className="absolute inset-0 border border-cyan-400/5" />
                    <div className="absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/10" />
                    <div className="absolute left-1/2 top-1/2 h-[220px] w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/10" />
                  </div>
                  {args.state.map.points.map((point) => (
                    <ScoreNode key={point.shopId} point={point} onSelect={setActiveShopId} />
                  ))}
                  <div className="absolute bottom-2 right-2 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                    Sector: DEN-ALPHA
                  </div>
                </div>
              </div>
            </section>

            <section className="col-span-12 lg:col-span-4">
              <div className="overflow-hidden border border-slate-800 bg-[rgba(10,13,20,0.88)]">
                {panelTitle('Top Shops Leaderboard')}
                <div className="max-h-[450px] overflow-auto bg-[#0a0d14]">
                  <table className="w-full whitespace-nowrap text-left">
                    <thead className="sticky top-0 bg-[#0f172a] font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                      <tr>
                        <th className="px-2 py-2">Rnk</th>
                        <th className="px-2 py-2">Entity</th>
                        <th className="px-2 py-2 text-right">Rev</th>
                        <th className="px-2 py-2 text-right">SEO</th>
                        <th className="px-2 py-2 text-right">Crt</th>
                        <th className="px-2 py-2 text-right">Last</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono text-xs">
                      {args.state.leaderboard.map((row) => (
                        <tr
                          key={row.shopId}
                          className="cursor-pointer transition hover:bg-slate-900/70"
                          onClick={() => setActiveShopId(row.shopId)}
                        >
                          <td className="px-2 py-2 text-slate-500">{String(row.rank).padStart(2, '0')}</td>
                          <td className="px-2 py-2 font-semibold text-slate-100">{row.name}</td>
                          <td className="px-2 py-2 text-right text-slate-200">{row.reviews.toLocaleString()}</td>
                          <td className={`px-2 py-2 text-right font-semibold ${row.tone === 'strong' ? 'text-cyan-300' : row.tone === 'warning' ? 'text-amber-300' : 'text-rose-300'}`}>
                            {row.score}
                          </td>
                          <td className="px-2 py-2 text-right text-slate-400">{row.oemCount}</td>
                          <td className="px-2 py-2 text-right text-slate-500">{row.lastScanLabel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="col-span-12 md:col-span-4">
              <div className="overflow-hidden border border-slate-800 bg-[rgba(10,13,20,0.88)]">
                {panelTitle('Weak SEO / High Authority Targets', <span className="border border-cyan-500/40 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Priority</span>)}
                <div className="max-h-[300px] overflow-auto bg-[#0a0d14]">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-[#0f172a] font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                      <tr>
                        <th className="px-2 py-2">Entity</th>
                        <th className="px-2 py-2 text-right">Rev</th>
                        <th className="px-2 py-2 text-right">SEO</th>
                        <th className="px-2 py-2 text-right">Missing</th>
                        <th className="px-2 py-2 text-right">Opp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono text-xs">
                      {args.state.opportunities.map((row) => (
                        <tr key={row.shopId} className="cursor-pointer transition hover:bg-slate-900/70" onClick={() => setActiveShopId(row.shopId)}>
                          <td className="px-2 py-2 font-semibold text-slate-100">{row.name}</td>
                          <td className="px-2 py-2 text-right text-slate-200">{row.reviews.toLocaleString()}</td>
                          <td className="px-2 py-2 text-right text-rose-300">{row.score}</td>
                          <td className="px-2 py-2 text-right text-slate-400">{row.missingCount}</td>
                          <td className="px-2 py-2 text-right font-semibold text-cyan-300">{row.opportunityScore.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="col-span-12 md:col-span-4">
              <div className="overflow-hidden border border-slate-800 bg-[rgba(10,13,20,0.88)]">
                {panelTitle('Competitor Topology')}
                <div className="flex h-[300px] items-center justify-center border-t border-slate-800 bg-[#020408]">
                  <svg viewBox="0 0 100 100" className="h-full w-full">
                    {args.state.topology.edges.map((edge) => {
                      const source = args.state.topology.nodes.find((node) => node.id === edge.sourceId);
                      const target = args.state.topology.nodes.find((node) => node.id === edge.targetId);
                      if (!source || !target) return null;
                      return (
                        <line
                          key={`${edge.sourceId}-${edge.targetId}`}
                          x1={source.x}
                          y1={source.y}
                          x2={target.x}
                          y2={target.y}
                          stroke="#1e293b"
                          strokeWidth="0.8"
                        />
                      );
                    })}
                    {args.state.topology.nodes.map((node) => (
                      <g key={node.id} onClick={() => setActiveShopId(node.id)} className="cursor-pointer">
                        <circle cx={node.x} cy={node.y} r={node.radius} fill="#0f172a" stroke={lineTone(node.tone)} strokeWidth="1.5" />
                        <text x={node.x} y={node.y + 2} textAnchor="middle" fill="#cbd5e1" fontSize="4" fontFamily="monospace">
                          {node.shortLabel}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>
            </section>

            <section className="col-span-12 md:col-span-4">
              <div className="overflow-hidden border border-slate-800 bg-[rgba(10,13,20,0.88)]">
                {panelTitle('Review Velocity (90d)')}
                <div className="h-[300px] border-t border-slate-800 bg-[#0a0d14] p-3">
                  <svg viewBox="0 0 100 100" className="h-full w-full">
                    <line x1="0" y1="10" x2="100" y2="10" stroke="#1e293b" strokeWidth="0.5" />
                    <line x1="0" y1="40" x2="100" y2="40" stroke="#1e293b" strokeWidth="0.5" />
                    <line x1="0" y1="70" x2="100" y2="70" stroke="#1e293b" strokeWidth="0.5" />
                    <line x1="0" y1="95" x2="100" y2="95" stroke="#334155" strokeWidth="1" />
                    {args.state.reviewVelocity.series.map((series) => (
                      <polyline
                        key={series.shopId}
                        points={series.points.map((point) => `${point.x},${point.y}`).join(' ')}
                        fill="none"
                        stroke={lineTone(series.tone)}
                        strokeWidth="1.6"
                      />
                    ))}
                  </svg>
                  <div className="mt-2 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                    {args.state.reviewVelocity.series.map((series) => (
                      <button key={series.shopId} type="button" className="flex items-center gap-2" onClick={() => setActiveShopId(series.shopId)}>
                        <span className="h-2 w-2" style={{ backgroundColor: lineTone(series.tone) }} />
                        <span>{series.label}</span>
                        <span className="text-slate-300">{series.latestCount}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="col-span-12 md:col-span-4">
              <div className="overflow-hidden border border-slate-800 bg-[rgba(10,13,20,0.88)]">
                {panelTitle('OEM Cert Coverage Matrix')}
                <div className="space-y-3 border-t border-slate-800 bg-[#0a0d14] p-3">
                  {args.state.oemMatrix.map((row) => (
                    <div key={row.label} className="grid grid-cols-[64px_1fr_48px] items-center gap-3 font-mono text-xs">
                      <span className="uppercase text-slate-200">{row.label}</span>
                      <div className="flex h-1.5 overflow-hidden border border-slate-800 bg-slate-950">
                        <div className="bg-blue-400" style={{ width: `${row.foundPercent}%` }} />
                        <div className="bg-rose-500/80" style={{ width: `${row.gapPercent}%` }} />
                      </div>
                      <span className="text-right text-slate-500">
                        {row.foundCount} / <span className="text-rose-300">{row.gapCount}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="col-span-12 md:col-span-4">
              <div className="overflow-hidden border border-slate-800 bg-[rgba(10,13,20,0.88)]">
                {panelTitle('System Operations')}
                <div className="space-y-3 border-t border-slate-800 bg-[#0a0d14] p-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="border border-slate-800 bg-[#0f172a] p-2">
                      <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-slate-500">Queued</div>
                      <div className="mt-1 text-lg font-semibold text-amber-300">{args.state.systemOperations.queuedJobs}</div>
                    </div>
                    <div className="border border-slate-800 bg-[#0f172a] p-2">
                      <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-slate-500">Running</div>
                      <div className="mt-1 text-lg font-semibold text-blue-300">{args.state.systemOperations.runningJobs}</div>
                    </div>
                    <div className="border border-slate-800 bg-[#0f172a] p-2">
                      <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-slate-500">Error Rate</div>
                      <div className="mt-1 text-lg font-semibold text-cyan-300">{args.state.systemOperations.errorRate1h}</div>
                    </div>
                  </div>
                  <div className="relative h-28 overflow-hidden border border-slate-800 bg-[#020408] p-2">
                    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
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
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-slate-500">
                    Workers: <span className="text-slate-200">{args.state.systemOperations.workerStatus}</span>
                  </div>
                  <div className="space-y-2">
                    {args.state.systemOperations.recentJobs.map((job) => (
                      <div key={job.id} className="grid grid-cols-[1fr_auto_auto] gap-3 border border-slate-800 bg-[#0f172a] px-2 py-2 text-[11px] font-mono">
                        <div className="truncate text-slate-200">{job.type}</div>
                        <div className="text-slate-500">{job.runAtLabel}</div>
                        <div className={job.status === 'failed' ? 'text-rose-300' : 'text-slate-400'}>{job.errorLabel}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="col-span-12">
              <div className="overflow-hidden border border-slate-800 bg-[rgba(10,13,20,0.88)]">
                {panelTitle(
                  'Integrity Watch',
                  <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                    <span>
                      Published <span className="text-cyan-300">{args.state.integrity.publishedCount}</span>
                    </span>
                    <span>
                      Private <span className="text-slate-300">{args.state.integrity.privateCount}</span>
                    </span>
                  </div>
                )}
                <div className="grid gap-3 border-t border-slate-800 bg-[#0a0d14] p-3 lg:grid-cols-3">
                  <div className="space-y-2">
                    <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-slate-500">Duplicate Warnings</div>
                    <div className="space-y-2">
                      {args.state.integrity.duplicateWarnings.map((row) => (
                        <div key={row.host} className="border border-slate-800 bg-[#0f172a] px-3 py-2 text-[11px] font-mono">
                          <div className="text-slate-200">{row.host}</div>
                          <div className="mt-1 text-slate-500">
                            {row.shopCount} shops · {row.cities.join(', ')}
                          </div>
                        </div>
                      ))}
                      {!args.state.integrity.duplicateWarnings.length ? (
                        <div className="border border-slate-800 bg-[#0f172a] px-3 py-2 text-[11px] font-mono text-slate-500">
                          No host-level duplicate warnings in this market slice.
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-slate-500">Chain Clusters</div>
                    <div className="space-y-2">
                      {args.state.integrity.chainClusters.map((row) => (
                        <div key={row.label} className="grid grid-cols-[1fr_auto_auto] gap-3 border border-slate-800 bg-[#0f172a] px-3 py-2 text-[11px] font-mono">
                          <div className="text-slate-200">{row.label}</div>
                          <div className="text-slate-400">{row.locationCount} loc</div>
                          <div className="text-cyan-300">{row.avgScore}</div>
                        </div>
                      ))}
                      {!args.state.integrity.chainClusters.length ? (
                        <div className="border border-slate-800 bg-[#0f172a] px-3 py-2 text-[11px] font-mono text-slate-500">
                          No chain clusters detected yet.
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-slate-500">Suspicious Scans</div>
                    <div className="space-y-2">
                      {args.state.integrity.suspiciousScans.map((row) => (
                        <button
                          key={row.shopId}
                          type="button"
                          onClick={() => setActiveShopId(row.shopId)}
                          className="grid w-full grid-cols-[1fr_auto] gap-3 border border-slate-800 bg-[#0f172a] px-3 py-2 text-left text-[11px] font-mono transition hover:bg-slate-900"
                        >
                          <div>
                            <div className="text-slate-200">{row.name}</div>
                            <div className="mt-1 text-slate-500">{row.reason}</div>
                          </div>
                          <div className="text-rose-300">{row.score}</div>
                        </button>
                      ))}
                      {!args.state.integrity.suspiciousScans.length ? (
                        <div className="border border-slate-800 bg-[#0f172a] px-3 py-2 text-[11px] font-mono text-slate-500">
                          No suspicious completed scans detected.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <ShopIntelDrawer open={Boolean(activeShop)} shop={activeShop} onClose={() => setActiveShopId(null)} />
    </>
  );
}
