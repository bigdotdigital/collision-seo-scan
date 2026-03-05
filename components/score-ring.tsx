export function ScoreRing({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const deg = Math.round((pct / 100) * 360);

  return (
    <div className="relative h-44 w-44">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(#0f766e ${deg}deg, #e2e8f0 ${deg}deg)`
        }}
      />
      <div className="absolute inset-3 flex items-center justify-center rounded-full bg-white">
        <div className="text-center">
          <p className="text-4xl font-bold text-slate-900">{pct}</p>
          <p className="text-xs uppercase tracking-wide text-slate-500">SEO score</p>
        </div>
      </div>
    </div>
  );
}
