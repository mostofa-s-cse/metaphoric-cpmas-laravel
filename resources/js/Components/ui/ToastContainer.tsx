import React from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { Toast, ToastVariant } from '@/hooks/useToast';

const ICONS: Record<ToastVariant, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
};

const STYLES: Record<ToastVariant, string> = {
  success: 'bg-emerald-950/95 border-emerald-700/60 text-emerald-200',
  error:   'bg-rose-950/95 border-rose-700/60 text-rose-200',
  warning: 'bg-amber-950/95 border-amber-700/60 text-amber-200',
  info:    'bg-slate-900/95 border-slate-700/60 text-slate-200',
};

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.variant];
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium backdrop-blur-sm max-w-sm animate-in slide-in-from-right duration-300 ${STYLES[toast.variant]}`}
          >
            <Icon className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="flex-1 leading-relaxed">{toast.message}</span>
            <button
              onClick={() => onRemove(toast.id)}
              className="ml-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
