type InfoTooltipProps = {
  label: string;
  text: string;
  className?: string;
};

export function InfoTooltip({ label, text, className = '' }: InfoTooltipProps) {
  return (
    <span className={`info-tooltip ${className}`.trim()}>
      <span className="info-tooltip-label">{label}</span>
      <span
        className="info-tooltip-dot"
        tabIndex={0}
        aria-label={`${label}: ${text}`}
      >
        i
      </span>
      <span className="info-tooltip-bubble" role="tooltip">
        {text}
      </span>
    </span>
  );
}
