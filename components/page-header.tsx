type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
};

export function PageHeader({ title, subtitle, actions, eyebrow = 'Collision Monitoring' }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-3 border-b border-white/10 pb-4 md:flex-row md:items-start md:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">{eyebrow}</p>
        <h1 className="text-[42px] font-semibold leading-none tracking-tight text-white">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-white/65">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
