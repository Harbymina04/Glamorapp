export function LoadingSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-xl border border-border-primary p-6">
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="flex-1 h-5 bg-surface-hover rounded animate-pulse-skeleton" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
