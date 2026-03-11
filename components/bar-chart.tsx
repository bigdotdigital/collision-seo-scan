type BarChartProps = {
  data: number[];
  activeIndex?: number;
  labels?: string[];
};

export function BarChart({ data, activeIndex = -1, labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] }: BarChartProps) {
  const max = Math.max(...data, 10);

  return (
    <div>
      <div className="bar-chart-container">
        {data.map((value, index) => (
          <div
            key={index}
            className={`chart-bar ${index === activeIndex ? 'active' : ''}`}
            style={{ height: `${(value / max) * 100}%` }}
            title={`Position: ${100 - value}`}
          />
        ))}
      </div>
      <div className="chart-axis">
        {labels.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>
    </div>
  );
}
