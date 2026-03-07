export function ScoreRing({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const deg = Math.round((pct / 100) * 360);
  const tone = pct >= 80 ? '#4ade80' : pct >= 60 ? '#d99a2b' : '#f87171';

  return (
    <div className="relative h-48 w-48">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(${tone} ${deg}deg, rgba(255,255,255,0.1) ${deg}deg)`,
          boxShadow: '0 0 40px rgba(0, 0, 0, 0.35)'
        }}
      />
      <div className="absolute inset-3 flex items-center justify-center rounded-full border border-white/20 bg-[#161413]">
        <div className="text-center">
          <p className="text-5xl font-light tracking-tight text-white">{pct}</p>
          <p className="text-xs uppercase tracking-[0.14em] text-[#c3beb9]">SEO score</p>
        </div>
      </div>
    </div>
  );
}
