import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export default function Pagination({ page, pages, total, limit, onPage }) {
  if (!pages || pages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 text-sm text-secondary-500">
      <span>Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total}</span>
      <div className="flex items-center gap-1">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)}
          className="p-1.5 rounded-lg hover:bg-secondary-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <FiChevronLeft size={16} />
        </button>
        {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
          const p = pages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= pages - 2 ? pages - 4 + i : page - 2 + i;
          return (
            <button key={p} onClick={() => onPage(p)}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${p === page ? 'bg-primary-500 text-white' : 'hover:bg-secondary-100'}`}>
              {p}
            </button>
          );
        })}
        <button disabled={page >= pages} onClick={() => onPage(page + 1)}
          className="p-1.5 rounded-lg hover:bg-secondary-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <FiChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}