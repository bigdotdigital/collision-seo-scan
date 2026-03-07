type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
};

export function PageHeader({ title, subtitle, actions, eyebrow = 'Collision Monitoring' }: PageHeaderProps) {
  return (
    <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{eyebrow}</p>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
