/**
 * ChartCard — standardised wrapper for all recharts charts
 * Provides: consistent title, subtitle, loading skeleton, empty state,
 * optional export button, and a custom tooltip.
 */
import { FiDownload } from 'react-icons/fi';

// ── Shared custom tooltip ─────────────────────────────────────────────────────
export function CustomTooltip({ active, payload, label, formatter, labelFormatter }) {
  if (!active || !payload?.length) return null;
  const displayLabel = labelFormatter ? labelFormatter(label) : label;
  return (
    <div className="bg-white border border-secondary-200 rounded-xl shadow-lg px-3 py-2.5 text-xs min-w-24">
      {displayLabel && <p className="font-semibold text-secondary-600 mb-1.5 truncate max-w-40">{displayLabel}</p>}
      {payload.map((entry, i) => {
        const value = formatter ? formatter(entry.value, entry.name) : entry.value;
        return (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-secondary-500 truncate max-w-28">{entry.name}</span>
            </div>
            <span className="font-bold text-secondary-800">{Array.isArray(value) ? value[0] : value}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Chart skeleton ─────────────────────────────────────────────────────────────
export function ChartSkeleton({ height = 220 }) {
  return (
    <div className="animate-pulse" style={{ height }}>
      <div className="flex items-end gap-2 h-full px-4 pb-4">
        {[60, 85, 45, 90, 70, 55, 80, 65].map((h, i) => (
          <div
            key={i}
            className="flex-1 bg-secondary-100 rounded-t-lg"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────
export function ChartEmpty({ message = 'No data available yet', height = 220 }) {
  return (
    <div className="flex flex-col items-center justify-center text-secondary-400 gap-2" style={{ height }}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="opacity-30">
        <rect x="4" y="28" width="8" height="16" rx="2" fill="currentColor" />
        <rect x="16" y="18" width="8" height="26" rx="2" fill="currentColor" />
        <rect x="28" y="22" width="8" height="22" rx="2" fill="currentColor" />
        <rect x="40" y="12" width="8" height="32" rx="2" fill="currentColor" />
      </svg>
      <p className="text-sm font-medium">{message}</p>
      <p className="text-xs">Data will appear once results are recorded</p>
    </div>
  );
}

// ── Main ChartCard ─────────────────────────────────────────────────────────────
export default function ChartCard({
  title,
  subtitle,
  loading = false,
  isEmpty = false,
  emptyMessage,
  height = 240,
  onExport,
  children,
  className = '',
}) {
  return (
    <div className={`card ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="section-title mb-0">{title}</h3>
          {subtitle && <p className="text-xs text-secondary-400 mt-0.5">{subtitle}</p>}
        </div>
        {onExport && !loading && !isEmpty && (
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 text-xs text-secondary-500 hover:text-primary-600 hover:bg-primary-50 px-2.5 py-1.5 rounded-lg transition-colors flex-shrink-0"
            title="Export chart data as CSV"
          >
            <FiDownload size={13} /> Export
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <ChartSkeleton height={height} />
      ) : isEmpty ? (
        <ChartEmpty message={emptyMessage} height={height} />
      ) : (
        children
      )}
    </div>
  );
}

// ── CSV export helper ──────────────────────────────────────────────────────────
export function exportCSV(data, filename = 'chart-data') {
  if (!data?.length) return;
  const keys = Object.keys(data[0]);
  const csv  = [
    keys.join(','),
    ...data.map((row) => keys.map((k) => `"${row[k] ?? ''}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
