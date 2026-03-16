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
  if (tone === 'strong') return 'text-[#67e8f9] border-[#0891b2]/60 bg-[rgba(6,182,212,0.14)]';
  if (tone === 'warning') return 'text-[#fbbf24] border-[#b45309]/60 bg-[rgba(245,158,11,0.14)]';
  if (tone === 'weak') return 'text-[#fb7185] border-[#be123c]/60 bg-[rgba(239,68,68,0.14)]';
  return 'text-[#60a5fa] border-[#2563eb]/60 bg-[rgba(59,130,246,0.14)]';
}

function overlapToneClass(tone: DrawerShop['scoreTone']) {
  if (tone === 'strong') return 'bg-[#06b6d4]';
  if (tone === 'warning') return 'bg-[#f59e0b]';
  if (tone === 'weak') return 'bg-[#ef4444]';
  return 'bg-[#3b82f6]';
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
        className={`fixed inset-0 z-30 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 ${
          args.open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={args.onClose}
      />
      <aside
        className={`fixed bottom-0 right-0 top-12 z-40 flex w-[450px] max-w-[94vw] flex-col border-l border-[#1e293b] bg-[#0a0d14] shadow-[-20px_0_50px_rgba(0,0,0,0.8)] transition-transform duration-300 ${
          args.open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="relative overflow-hidden border-b border-[#1e293b] bg-[#0f172a] p-4">
          <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[#06b6d4]/5 blur-2xl" />
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex gap-2">
                <span className="border border-[#334155] bg-[#1e293b] px-1.5 py-0.5 text-[9px] font-mono uppercase text-[#cbd5e1]">
                  {shop?.typeLabel || 'Shop'}
                </span>
                {shop ? (
                  <span className={`border px-1.5 py-0.5 text-[9px] font-mono uppercase ${toneClasses(shop.scoreTone)}`}>
                    High Signal
                  </span>
                ) : null}
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">{shop?.name || 'Select a shop'}</h2>
              <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.18em] text-[#94a3b8]">
                {shop?.addressLabel || 'No shop selected'}
              </p>
              <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.18em] text-[#94a3b8]">
                URL: {shop?.websiteLabel || 'Unavailable'}
              </div>
            </div>
            <button
              type="button"
              onClick={args.onClose}
              className="border border-[#334155] bg-[#1e293b] p-1 text-[#94a3b8] transition-colors hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="relative overflow-hidden border border-[#1e293b] bg-[#0f172a] p-3">
              <div className="mb-2 text-[9px] font-mono uppercase tracking-[0.22em] text-[#94a3b8]">Total Reviews</div>
              <div className="text-2xl font-mono font-bold text-[#e2e8f0]">{shop?.reviews.toLocaleString() || '0'}</div>
              <div className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-white/5 blur-xl" />
            </div>
            <div className={`relative overflow-hidden border p-3 ${shop ? toneClasses(shop.scoreTone) : 'border-[#1e293b] bg-[#0f172a] text-[#e2e8f0]'}`}>
              <div className="mb-2 text-[9px] font-mono uppercase tracking-[0.22em] text-[#94a3b8]">SEO Score</div>
              <div className="text-2xl font-mono font-bold">{shop?.score || 0}</div>
              <div className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-current/10 blur-xl" />
            </div>
          </div>

          <section className="space-y-4">
            <h3 className="border-b border-[#1e293b] pb-2 text-xs font-mono font-bold uppercase tracking-[0.24em] text-[#e2e8f0]">
              Extracted Entities
            </h3>

            <div>
                <div className="mb-2 text-[9px] font-mono uppercase tracking-[0.22em] text-[#94a3b8]">
                OEM Certifications (Found: {shop?.oemCertifications.length || 0})
              </div>
              <div className="flex flex-wrap gap-2">
                {(shop?.oemCertifications.length ? shop.oemCertifications : ['None detected']).map((item) => (
                  <span
                    key={item}
                    className="flex items-center gap-1 border border-[#1e293b] bg-[#0f172a] px-2 py-1 text-[11px] font-mono text-[#e2e8f0]"
                  >
                    {shop?.oemCertifications.length ? <span className="h-1.5 w-1.5 bg-[#06b6d4]" /> : null}
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-[9px] font-mono uppercase tracking-[0.22em] text-[#94a3b8]">Insurer Mentions</div>
              <div className="flex flex-wrap gap-2">
                {(shop?.insurerMentions.length ? shop.insurerMentions : []).map((item) => (
                  <span key={`${item.name}-${item.signal}`} className="border border-[#1e293b] bg-[#0f172a] px-2 py-1 text-[11px] font-mono text-[#e2e8f0]">
                    {item.name}
                  </span>
                ))}
                {!shop?.insurerMentions.length ? (
                  <span className="border border-dashed border-[#334155] bg-[#05070a] px-2 py-1 text-[11px] font-mono text-[#94a3b8] opacity-80">
                    No insurer signals detected
                  </span>
                ) : null}
              </div>
            </div>

            <div>
              <div className="mb-2 text-[9px] font-mono uppercase tracking-[0.22em] text-[#94a3b8]">Conversion Signals</div>
              <div className="flex flex-wrap gap-2">
                {(shop?.conversionSignals || []).map((item) => (
                  <span key={item} className="border border-[#1e293b] bg-[#0f172a] px-2 py-1 text-[11px] font-mono text-[#e2e8f0]">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-3 border-t border-[#1e293b]/50 pt-2">
            <h3 className="border-b border-[#1e293b] pb-2 text-xs font-mono font-bold uppercase tracking-[0.24em] text-[#e2e8f0]">
              Competitive Overlap
            </h3>
            <div className="mb-2 text-[10px] font-mono text-[#94a3b8]">Similarity index based on SERP overlap:</div>
            <div className="space-y-2 text-xs font-mono">
              {(shop?.overlap || []).map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-3">
                  <span className="truncate text-[#e2e8f0]">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 bg-[#0f172a]">
                      <div className={`h-full ${overlapToneClass(item.tone)}`} style={{ width: `${item.percent}%` }} />
                    </div>
                    <span className="w-8 text-right text-[#94a3b8]">{item.percent}%</span>
                  </div>
                </div>
              ))}
              {!shop?.overlap.length ? <p className="text-xs font-mono text-[#94a3b8]">No recent overlap edges recorded.</p> : null}
            </div>
          </section>

          <section className="space-y-3 border-t border-[#1e293b]/50 pt-2">
            <h3 className="border-b border-[#1e293b] pb-2 text-xs font-mono font-bold uppercase tracking-[0.24em] text-[#e2e8f0]">
              Crawl Details
            </h3>
            <div className="grid grid-cols-2 gap-y-2 border border-[#1e293b] bg-[#0f172a] p-3 text-[11px] font-mono">
              <div className="uppercase tracking-[0.2em] text-[#94a3b8]">Last Scan:</div>
              <div className="text-right text-[#e2e8f0]">{shop?.crawl.lastScanLabel || 'Unavailable'}</div>
              <div className="uppercase tracking-[0.2em] text-[#94a3b8]">Est. Pages:</div>
              <div className="text-right text-[#e2e8f0]">{shop?.crawl.checkedPagesLabel || '0'}</div>
              <div className="uppercase tracking-[0.2em] text-[#94a3b8]">Crawl Errors:</div>
              <div className="text-right text-[#67e8f9]">{shop?.crawl.crawlErrorsLabel || '0'}</div>
            </div>
          </section>
        </div>

        <footer className="flex gap-3 border-t border-[#1e293b] bg-[#05070a] p-4">
          <button
            type="button"
            className="flex-1 border border-[#06b6d4]/50 bg-transparent px-4 py-2.5 text-xs font-mono uppercase tracking-[0.24em] text-[#67e8f9] transition-colors hover:bg-[#1e293b]"
          >
            Force Rescan
          </button>
          {shop?.publicReportUrl ? (
            <a
              href={shop.publicReportUrl}
              className="flex-1 border border-[#334155] bg-[#1e293b] px-4 py-2.5 text-center text-xs font-mono font-bold uppercase tracking-[0.24em] text-white transition-colors hover:bg-[#334155]"
            >
              Public Report
            </a>
          ) : (
            <div className="flex-1 border border-[#334155] px-4 py-2.5 text-center text-xs font-mono uppercase tracking-[0.24em] text-[#94a3b8]">
              Not published
            </div>
          )}
        </footer>
      </aside>
    </>
  );
}
