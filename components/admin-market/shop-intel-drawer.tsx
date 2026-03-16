'use client';

type DrawerShop = {
  id: string;
  name: string;
  addressLabel: string;
  websiteLabel: string;
  publicReportUrl: string | null;
  reviews: number;
  score: number;
  typeLabel: string;
  scoreTone: 'strong' | 'warning' | 'weak' | 'neutral';
  oemCertifications: string[];
  insurerMentions: Array<{ name: string; signal: string; confidence: number }>;
  conversionSignals: string[];
  overlap: Array<{ name: string; percent: number; tone: 'strong' | 'warning' | 'weak' | 'neutral' }>;
  crawl: {
    lastScanLabel: string;
    checkedPagesLabel: string;
    crawlErrorsLabel: string;
  };
};

function toneClasses(tone: DrawerShop['scoreTone']) {
  if (tone === 'strong') return 'text-cyan-300 border-cyan-500/60 bg-cyan-500/10';
  if (tone === 'warning') return 'text-amber-300 border-amber-500/60 bg-amber-500/10';
  if (tone === 'weak') return 'text-rose-300 border-rose-500/60 bg-rose-500/10';
  return 'text-blue-300 border-blue-500/60 bg-blue-500/10';
}

export function ShopIntelDrawer(args: {
  open: boolean;
  shop: DrawerShop | null;
  onClose: () => void;
}) {
  const shop = args.shop;

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/60 transition-opacity ${args.open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={args.onClose}
      />
      <aside
        className={`fixed right-0 top-12 bottom-0 z-40 flex w-[440px] max-w-[92vw] flex-col border-l border-slate-800 bg-[#0a0d14] shadow-[-20px_0_50px_rgba(0,0,0,0.75)] transition-transform duration-300 ${
          args.open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="border-b border-slate-800 bg-[#0f172a] px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-slate-400">
                <span className="border border-slate-700 px-1.5 py-0.5">{shop?.typeLabel || 'Shop'}</span>
                {shop ? <span className={`border px-1.5 py-0.5 ${toneClasses(shop.scoreTone)}`}>Signal</span> : null}
              </div>
              <h2 className="text-xl font-semibold text-slate-100">{shop?.name || 'Select a shop'}</h2>
              <p className="mt-1 text-xs font-mono uppercase tracking-[0.18em] text-slate-400">
                {shop?.addressLabel || 'No shop selected'}
              </p>
              <p className="mt-1 text-[11px] font-mono uppercase tracking-[0.18em] text-slate-500">
                URL: {shop?.websiteLabel || 'Unavailable'}
              </p>
            </div>
            <button
              type="button"
              onClick={args.onClose}
              className="border border-slate-700 bg-slate-900 px-2 py-1 text-slate-400 transition hover:text-slate-100"
            >
              X
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-slate-800 bg-[#0f172a] p-3">
              <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-slate-500">Total Reviews</div>
              <div className="mt-2 text-2xl font-semibold text-slate-100">{shop?.reviews.toLocaleString() || '0'}</div>
            </div>
            <div className={`border p-3 ${shop ? toneClasses(shop.scoreTone) : 'border-slate-800 bg-[#0f172a] text-slate-100'}`}>
              <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-slate-400">SEO Score</div>
              <div className="mt-2 text-2xl font-semibold">{shop?.score || 0}</div>
            </div>
          </div>

          <section className="space-y-3">
            <h3 className="border-b border-slate-800 pb-2 text-xs font-mono font-semibold uppercase tracking-[0.24em] text-slate-200">
              Extracted Entities
            </h3>
            <div>
              <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.22em] text-slate-500">
                OEM Certifications ({shop?.oemCertifications.length || 0})
              </div>
              <div className="flex flex-wrap gap-2">
                {(shop?.oemCertifications.length ? shop.oemCertifications : ['None detected']).map((item) => (
                  <span key={item} className="border border-slate-700 bg-[#0f172a] px-2 py-1 text-[11px] font-mono text-slate-200">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.22em] text-slate-500">Insurer Mentions</div>
              <div className="flex flex-wrap gap-2">
                {(shop?.insurerMentions.length ? shop.insurerMentions : []).map((item) => (
                  <span key={`${item.name}-${item.signal}`} className="border border-slate-700 bg-[#0f172a] px-2 py-1 text-[11px] font-mono text-slate-200">
                    {item.name} <span className="text-slate-500">({item.signal})</span>
                  </span>
                ))}
                {!shop?.insurerMentions.length ? (
                  <span className="border border-dashed border-slate-700 px-2 py-1 text-[11px] font-mono text-slate-500">
                    No insurer signals detected
                  </span>
                ) : null}
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="border-b border-slate-800 pb-2 text-xs font-mono font-semibold uppercase tracking-[0.24em] text-slate-200">
              Conversion Signals
            </h3>
            <div className="flex flex-wrap gap-2">
              {(shop?.conversionSignals || []).map((item) => (
                <span key={item} className="border border-slate-700 bg-[#0f172a] px-2 py-1 text-[11px] font-mono text-slate-200">
                  {item}
                </span>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="border-b border-slate-800 pb-2 text-xs font-mono font-semibold uppercase tracking-[0.24em] text-slate-200">
              Competitive Overlap
            </h3>
            <div className="space-y-2">
              {(shop?.overlap || []).map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-3 text-xs font-mono">
                  <span className="truncate text-slate-200">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 border border-slate-800 bg-slate-950">
                      <div
                        className={`h-full ${
                          item.tone === 'warning'
                            ? 'bg-amber-400'
                            : item.tone === 'strong'
                              ? 'bg-cyan-400'
                              : item.tone === 'weak'
                                ? 'bg-rose-400'
                                : 'bg-blue-400'
                        }`}
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                    <span className="w-9 text-right text-slate-400">{item.percent}%</span>
                  </div>
                </div>
              ))}
              {!shop?.overlap.length ? (
                <p className="text-xs font-mono text-slate-500">No recent overlap edges recorded.</p>
              ) : null}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="border-b border-slate-800 pb-2 text-xs font-mono font-semibold uppercase tracking-[0.24em] text-slate-200">
              Crawl Details
            </h3>
            <div className="grid grid-cols-2 gap-y-2 border border-slate-800 bg-[#0f172a] p-3 text-[11px] font-mono">
              <div className="uppercase tracking-[0.22em] text-slate-500">Last Scan</div>
              <div className="text-right text-slate-100">{shop?.crawl.lastScanLabel || 'Unavailable'}</div>
              <div className="uppercase tracking-[0.22em] text-slate-500">Checked Pages</div>
              <div className="text-right text-slate-100">{shop?.crawl.checkedPagesLabel || '0'}</div>
              <div className="uppercase tracking-[0.22em] text-slate-500">Crawl Errors</div>
              <div className="text-right text-slate-100">{shop?.crawl.crawlErrorsLabel || '0'}</div>
            </div>
          </section>
        </div>

        <footer className="flex gap-3 border-t border-slate-800 bg-[#05070a] p-4">
          {shop?.publicReportUrl ? (
            <a
              href={shop.publicReportUrl}
              className="flex-1 border border-slate-700 bg-slate-900 px-4 py-2 text-center text-xs font-mono font-semibold uppercase tracking-[0.24em] text-slate-100 transition hover:bg-slate-800"
            >
              Public Report
            </a>
          ) : (
            <div className="flex-1 border border-slate-800 px-4 py-2 text-center text-xs font-mono uppercase tracking-[0.24em] text-slate-500">
              Not published
            </div>
          )}
        </footer>
      </aside>
    </>
  );
}
