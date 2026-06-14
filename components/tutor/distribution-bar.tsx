export function DistributionBar({
  low,
  mid,
  high,
  total,
  className,
}: {
  low: number;
  mid: number;
  high: number;
  total: number;
  className?: string;
}) {
  const t = total || 1;
  const lowPct = (low / t) * 100;
  const midPct = (mid / t) * 100;
  const highPct = (high / t) * 100;

  return (
    <div
      role="img"
      aria-label={`Low: ${low}, Mid: ${mid}, High: ${high}`}
      title={`Low (<30): ${low}  Mid (30-59): ${mid}  High (60+): ${high}`}
      className={`flex h-1.5 rounded-md overflow-hidden bg-muted ${className ?? "w-32"}`}
    >
      <div className="h-full bg-status-error" style={{ width: `${lowPct}%` }} />
      <div className="h-full bg-status-warning" style={{ width: `${midPct}%` }} />
      <div className="h-full bg-primary" style={{ width: `${highPct}%` }} />
    </div>
  );
}
