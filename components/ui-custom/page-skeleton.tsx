/**
 * Shared skeleton components for loading states.
 * Used by per-page loading.tsx files to show placeholder UI.
 */

export function SkeletonPulse({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-white/[0.04] ${className}`}
      style={{ border: "1px solid rgba(255,255,255,0.04)" }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div
      className="rounded-2xl p-5 space-y-3"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <SkeletonPulse className="h-4 w-1/3" />
      <SkeletonPulse className="h-8 w-2/3" />
      <SkeletonPulse className="h-3 w-1/2" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <SkeletonPulse className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonPulse key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return <SkeletonPulse className="h-[300px] w-full" />;
}

export function PageSkeleton({
  title,
  cards = 4,
  showChart = false,
  showTable = false,
}: {
  title?: string;
  cards?: number;
  showChart?: boolean;
  showTable?: boolean;
}) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="space-y-2">
        {title ? (
          <h1 className="text-2xl font-bold text-white/20">{title}</h1>
        ) : (
          <SkeletonPulse className="h-8 w-48" />
        )}
        <SkeletonPulse className="h-4 w-72" />
      </div>

      {/* Stats cards */}
      {cards > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: cards }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Chart */}
      {showChart && <SkeletonChart />}

      {/* Table */}
      {showTable && <SkeletonTable />}
    </div>
  );
}
