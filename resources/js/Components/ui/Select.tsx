
import React, { forwardRef } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  options?: SelectOption[];
  children?: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', error, options, children, ...props }, ref) => {
    return (
      <div className="w-full">
        <select
          ref={ref}
          className={`
            w-full bg-slate-950/40 border rounded-xl px-3 py-2.5 text-xs text-slate-300 
            focus:outline-none focus:ring-1 transition-all cursor-pointer shadow-inner
            ${
              error
                ? 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/30'
                : 'border-slate-800 focus:border-cyan-500/80 focus:ring-cyan-500/30'
            }
            ${className}
          `}
          {...props}
        >
          {children
            ? children
            : options?.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-200">
                  {opt.label}
                </option>
              ))}
        </select>
        {error && <p className="text-rose-400 text-[10px] mt-1 ml-1 font-medium">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
