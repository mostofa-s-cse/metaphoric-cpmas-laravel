
/**
 * AlertDialog — for dangerous actions like delete (shadcn Alert Dialog style).
 * Integrates reusable Button component.
 */

import React, { useEffect, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isConfirming?: boolean;
}

export function AlertDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Continue',
  cancelText = 'Cancel',
  isConfirming = false,
}: AlertDialogProps) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isConfirming) onClose();
    },
    [onClose, isConfirming]
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="alertdialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={() => !isConfirming && onClose()}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 sm:p-6">
          <div className="flex gap-3 sm:gap-4">
            <div className="shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-rose-500/10 flex items-center justify-center mt-0.5 border border-rose-500/20">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-rose-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100">{title}</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1.5 sm:mt-2 leading-relaxed">
                {description}
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-950/50 border-t border-slate-800 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isConfirming}
            className="text-slate-350"
          >
            {cancelText}
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            loading={isConfirming}
            className="bg-rose-600 hover:bg-rose-700 !text-white font-bold border-none min-w-[100px]"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
