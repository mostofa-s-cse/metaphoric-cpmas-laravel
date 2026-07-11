
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  limit,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  const handlePrev = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  // Nothing to paginate — everything already fits on one page.
  if (totalItems <= limit) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-6 border-t border-slate-800 bg-slate-950/20 text-xs text-slate-400 select-none">
      {/* Left side: Rows per page selector */}
      <div className="flex items-center gap-2">
        <span className="text-slate-500">Rows per page:</span>
        <select
          value={limit}
          onChange={(e) => {
            onLimitChange(Number(e.target.value));
            onPageChange(1); // Reset to page 1 on limit change
          }}
          className="bg-slate-900/80 border border-slate-800 rounded-lg py-1 px-2 text-slate-300 focus:outline-none focus:border-cyan-500/80 cursor-pointer text-xs"
        >
          {[5, 10, 20, 50].map((val) => (
            <option key={val} value={val} className="bg-slate-950 text-slate-300">
              {val}
            </option>
          ))}
        </select>
        <span className="text-[10px] text-slate-600 ml-1">
          (Total records: {totalItems})
        </span>
      </div>

      {/* Right side: Page controls */}
      <div className="flex items-center gap-4">
        <span className="text-slate-400">
          Page <span className="font-bold text-slate-200">{currentPage}</span> of{' '}
          <span className="font-bold text-slate-200">{totalPages || 1}</span>
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={handlePrev}
            disabled={currentPage <= 1}
            type="button"
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              currentPage <= 1
                ? 'border-slate-800/40 text-slate-600 bg-slate-900/10 cursor-not-allowed'
                : 'border-slate-800 text-slate-400 bg-slate-900/40 hover:bg-slate-800 hover:text-slate-200 active:scale-95'
            }`}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleNext}
            disabled={currentPage >= totalPages}
            type="button"
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              currentPage >= totalPages
                ? 'border-slate-800/40 text-slate-600 bg-slate-900/10 cursor-not-allowed'
                : 'border-slate-800 text-slate-400 bg-slate-900/40 hover:bg-slate-800 hover:text-slate-200 active:scale-95'
            }`}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
