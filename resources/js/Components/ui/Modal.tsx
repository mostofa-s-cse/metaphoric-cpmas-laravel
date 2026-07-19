
/**
 * Modal — base dialog component (shadcn Dialog style, zero external deps).
 * Responsive paddings and layouts for optimized mobile views.
 */

import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  children: React.ReactNode;
  /** Extra classes for the panel */
  className?: string;
}

const sizeMap: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  className = '',
}: ModalProps) {
  // Close on Escape key
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

  // Portaled to document.body so this overlay never inherits layout from
  // wherever it's mounted in the page tree — e.g. a `space-y-*` ancestor
  // adds margin-top to non-first siblings regardless of `position`, which
  // was visibly shifting this fixed overlay down from the true viewport top.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`
          relative w-full ${sizeMap[size]}
          bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl
          overflow-y-auto max-h-[90vh] sm:max-h-[85vh]
          animate-in fade-in zoom-in-95 duration-150
          ${className}
        `}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between p-4 pb-3 sm:p-6 sm:pb-4 border-b border-slate-800">
            <div>
              {title && (
                <h2 className="text-sm font-bold text-slate-100">{title}</h2>
              )}
              {description && (
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="ml-4 shrink-0 text-slate-500 hover:text-slate-200 transition-colors cursor-pointer rounded-lg p-0.5 hover:bg-slate-800"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}
