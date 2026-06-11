export default function ProgressBar({ spent, allocated, rollover = 0 }) {
  if (!allocated || allocated <= 0) {
    return (
      <div className="h-1.5 w-full rounded-full bg-gray-700 border border-dashed border-gray-600" />
    );
  }

  const pct = Math.min((spent / allocated) * 100, 100);
  const rolloverPct = Math.min((rollover / allocated) * 100, 100 - pct);

  let barColor = "bg-green-500";
  if (pct >= 100) barColor = "bg-red-500";
  else if (pct >= 80) barColor = "bg-amber-500";

  return (
    <div className="h-1.5 w-full rounded-full bg-gray-700 overflow-hidden flex">
      <div className={`h-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      {rolloverPct > 0 && (
        <div className="h-full bg-blue-800 opacity-60" style={{ width: `${rolloverPct}%` }} />
      )}
    </div>
  );
}
