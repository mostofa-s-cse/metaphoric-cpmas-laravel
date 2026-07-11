
/**
 * Drawer — base slide-over component (shadcn Sheet style).
 * Responsive paddings optimized for compact mobile screen widths.
 */

import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
  className?: string;
}

const sizeMap: Record<NonNullable<DrawerProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'w-full',
};

export function Drawer({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  className = '',
}: DrawerProps) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, handleKey]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`
          relative h-full w-full ${sizeMap[size]} bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col
          animate-in slide-in-from-right duration-300
          ${className}
        `}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between p-4 sm:p-6 border-b border-slate-800 shrink-0">
            <div>
              {title && <h2 className="text-base sm:text-lg font-bold text-slate-100">{title}</h2>}
              {description && <p className="text-xs sm:text-sm text-slate-400 mt-1">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-200 transition-colors p-1 rounded-md hover:bg-slate-800 shrink-0 ml-4 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
