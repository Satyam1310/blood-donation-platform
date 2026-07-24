export default function MilestoneBadge({ label, threshold, earned, isNext }) {
  return (
    <div
      className={`flex flex-col items-center gap-2 min-w-[110px] ${
        earned ? "" : "opacity-40"
      }`}
    >
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center font-mono text-xs font-medium border-2 ${
          earned
            ? "bg-crimson text-white border-crimson"
            : isNext
            ? "border-amber text-amber bg-amber-light"
            : "border-line text-ink-soft"
        }`}
      >
        {threshold}
      </div>
      <span className="text-xs text-center font-medium text-ink-soft">{label}</span>
    </div>
  );
}
