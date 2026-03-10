type Segment = {
  value: number;
  color: string;
  label: string;
};

export function MultiProgressBar({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);

  if (segments.length === 0 || total <= 0) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="mb-3 flex h-3 overflow-hidden rounded-full">
        {segments.map((segment, index) => (
          <div
            key={index}
            className="h-full"
            style={{
              width: `${(segment.value / total) * 100}%`,
              backgroundColor: segment.color
            }}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-[var(--text-secondary)]">
        {segments.map((segment, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: segment.color }} />
            <span>{segment.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
