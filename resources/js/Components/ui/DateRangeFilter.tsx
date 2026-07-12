import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onApply: (startDate: string, endDate: string) => void;
  className?: string;
}

export function DateRangeFilter({
  startDate,
  endDate,
  onApply,
  className = '',
}: DateRangeFilterProps) {
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);

  // Keep the draft in sync if the applied range changes from outside
  // (e.g. a page-level "Clear Filters" action).
  useEffect(() => {
    setDraftStart(startDate);
    setDraftEnd(endDate);
  }, [startDate, endDate]);

  const hasChanges = draftStart !== startDate || draftEnd !== endDate;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-[10px] text-slate-500 font-semibold uppercase">From</span>
      <input
        type="date"
        value={draftStart}
        onChange={(e) => setDraftStart(e.target.value)}
        className="bg-slate-950/40 border border-slate-800/80 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/80 cursor-pointer"
        style={{ colorScheme: 'dark' }}
      />
      <span className="text-[10px] text-slate-500 font-semibold uppercase">To</span>
      <input
        type="date"
        value={draftEnd}
        onChange={(e) => setDraftEnd(e.target.value)}
        className="bg-slate-950/40 border border-slate-800/80 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/80 cursor-pointer"
        style={{ colorScheme: 'dark' }}
      />
      <button
        onClick={() => onApply(draftStart, draftEnd)}
        disabled={!hasChanges}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Check className="h-3.5 w-3.5" />
        Apply
      </button>
    </div>
  );
}
