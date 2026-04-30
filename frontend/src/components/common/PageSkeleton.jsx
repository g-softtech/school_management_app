/**
 * PageSkeleton — reusable skeleton loader for full dashboard pages
 * Usage: <PageSkeleton type="dashboard" /> | <PageSkeleton type="stats" cols={4} />
 */

// Single stat tile skeleton
function StatTile() {
  return (
    <div className="card animate-pulse flex items-center gap-3">
      <div className="w-10 h-10 bg-secondary-100 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-2.5 bg-secondary-100 rounded w-20" />
        <div className="h-5 bg-secondary-100 rounded w-14" />
      </div>
    </div>
  );
}

// Table row skeleton
function TableRow({ cols = 5 }) {
  return (
    <tr className="animate-pulse">
      {[...Array(cols)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 bg-secondary-100 rounded" style={{ width: `${60 + (i * 13) % 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

// Chart area skeleton
function ChartArea({ height = 220 }) {
  return (
    <div className="card animate-pulse">
      <div className="h-4 bg-secondary-100 rounded w-32 mb-4" />
      <div className="flex items-end gap-2 pb-4" style={{ height }}>
        {[55, 80, 65, 90, 45, 75, 60, 85].map((h, i) => (
          <div key={i} className="flex-1 bg-secondary-100 rounded-t-lg" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

// Card list item skeleton
function ListItem() {
  return (
    <div className="flex items-center gap-3 animate-pulse p-2.5">
      <div className="w-9 h-9 bg-secondary-100 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-secondary-100 rounded w-3/4" />
        <div className="h-2.5 bg-secondary-100 rounded w-1/2" />
      </div>
      <div className="h-3 bg-secondary-100 rounded w-12" />
    </div>
  );
}

export default function PageSkeleton({ type = 'dashboard', statCols = 4, rows = 5, showCharts = true }) {
  if (type === 'table') {
    return (
      <div className="space-y-4">
        <div className="flex justify-between animate-pulse">
          <div className="h-6 bg-secondary-100 rounded w-40" />
          <div className="h-8 bg-secondary-100 rounded w-28" />
        </div>
        <div className="card overflow-hidden p-0">
          <div className="px-4 py-3 bg-secondary-50 flex gap-6 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-3 bg-secondary-200 rounded w-16" />
            ))}
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-secondary-50">
              {[...Array(rows)].map((_, i) => <TableRow key={i} />)}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="card space-y-1 divide-y divide-secondary-50">
        {[...Array(rows)].map((_, i) => <ListItem key={i} />)}
      </div>
    );
  }

  // Default: dashboard
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center animate-pulse">
        <div className="space-y-2">
          <div className="h-6 bg-secondary-100 rounded w-44" />
          <div className="h-3.5 bg-secondary-100 rounded w-64" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 bg-secondary-100 rounded w-28" />
          <div className="h-8 bg-secondary-100 rounded w-28" />
        </div>
      </div>

      {/* Stat tiles */}
      <div className={`grid grid-cols-2 lg:grid-cols-${statCols} gap-4`}>
        {[...Array(statCols)].map((_, i) => <StatTile key={i} />)}
      </div>

      {/* Charts */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartArea />
          <ChartArea />
        </div>
      )}
    </div>
  );
}

// Named exports for granular use
export { StatTile, ChartArea, ListItem, TableRow };
