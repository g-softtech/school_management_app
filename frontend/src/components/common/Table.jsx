export default function Table({ columns, data, loading, emptyMessage = 'No data found' }) {
  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
    </div>
  );
  return (
    <div className="table-wrapper">
      <table className="table-base">
        <thead className="table-head">
          <tr>{columns.map((c) => <th key={c.key} className="table-th">{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {data.length === 0
            ? <tr><td colSpan={columns.length} className="text-center py-12 text-secondary-400 text-sm">{emptyMessage}</td></tr>
            : data.map((row, i) => (
                <tr key={i} className="table-row">
                  {columns.map((c) => (
                    <td key={c.key} className="table-td">
                      {c.render ? c.render(row[c.key], row) : row[c.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
          }
        </tbody>
      </table>
    </div>
  );
}