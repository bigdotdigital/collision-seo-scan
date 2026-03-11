type Segment = {
  color: string;
  value: number;
  label: string;
};

export function PieChart({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let start = 0;
  const gradientStops = segments
    .map((segment) => {
      const pct = total > 0 ? (segment.value / total) * 100 : 0;
      const stop = `${segment.color} ${start}% ${start + pct}%`;
      start += pct;
      return stop;
    })
    .join(', ');

  return (
    <div className="pie-chart-wrapper">
      <div
        className="pie-chart"
        style={{
          background:
            total > 0
              ? `conic-gradient(${gradientStops})`
              : 'conic-gradient(var(--border-light) 0% 100%)'
        }}
      />
      <div className="legend-grid">
        {segments.map((seg, i) => (
          <div key={i} className="legend-item">
            <div className="legend-dot" style={{ background: seg.color }} />
            {seg.label}
          </div>
        ))}
      </div>
    </div>
  );
}
