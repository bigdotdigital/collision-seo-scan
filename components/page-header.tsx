type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
};

export function PageHeader({ title, subtitle, actions, eyebrow = 'Collision Monitoring' }: PageHeaderProps) {
  return (
    <header className="dashboard-page-header">
      <div>
        <p className="dashboard-label">{eyebrow}</p>
        <h1 className="dashboard-page-title">{title}</h1>
        {subtitle ? <p className="dashboard-body mt-2 max-w-3xl">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
