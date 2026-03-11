type OrbitStat = {
  value: number;
  label: string;
};

export function HeroMetric({ value, label, orbitStats }: { value: number; label: string; orbitStats: OrbitStat[] }) {
  return (
    <div className="hero-metric-container">
      <div className="hero-circle">
        <div className="hero-value">{value}</div>
        <div className="hero-label">{label}</div>
      </div>
      <div className="orbit-metrics">
        {orbitStats.map((stat, i) => (
          <div key={i} className={`orbit-metric ${i % 2 ? 'top-right' : 'bottom-right'}`}>
            <div className="orbit-value">{stat.value}</div>
            <div className="orbit-label">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
