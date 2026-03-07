type SettingRow = {
  label: string;
  value: string;
};

type SettingsPanelProps = {
  title: string;
  rows: SettingRow[];
  hint?: string;
};

export function SettingsPanel({ title, rows, hint }: SettingsPanelProps) {
  return (
    <article className="card p-5">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-slate-600">{hint}</p> : null}
      <dl className="mt-4 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 rounded-md bg-slate-50 px-3 py-2">
            <dt className="text-sm text-slate-600">{row.label}</dt>
            <dd className="text-sm font-medium text-slate-900">{row.value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

