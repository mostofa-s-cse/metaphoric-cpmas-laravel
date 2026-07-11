
import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, icon, type = 'text', style, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none shrink-0">
              {icon}
            </div>
          )}
          <input
            type={type}
            ref={ref}
            style={{ colorScheme: 'dark', ...style }}
            className={`
              w-full bg-slate-950/40 border rounded-xl px-3 py-2.5 text-xs text-slate-200 
              placeholder-slate-550 focus:outline-none focus:ring-1 transition-all shadow-inner
              ${icon ? 'pl-10' : 'pl-3'}
              ${
                error
                  ? 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/30'
                  : 'border-slate-800 focus:border-cyan-500/80 focus:ring-cyan-500/30'
              }
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <p className="text-rose-400 text-[10px] mt-1 ml-1 font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
