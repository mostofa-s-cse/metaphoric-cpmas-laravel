import { useState, useCallback, useRef } from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

let globalAddToast: ((message: string, variant: ToastVariant) => void) | null = null;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((msg: string) => addToast(msg, 'success'), [addToast]);
  const error   = useCallback((msg: string) => addToast(msg, 'error'),   [addToast]);
  const warning = useCallback((msg: string) => addToast(msg, 'warning'), [addToast]);
  const info    = useCallback((msg: string) => addToast(msg, 'info'),    [addToast]);

  const handlePromise = useCallback(
    async <T>(
      promise: Promise<T>,
      options?: {
        successMessage?: string;
        errorMessage?: string;
      }
    ): Promise<T> => {
      try {
        const res = await promise;
        success(options?.successMessage || 'Operation successful');
        return res;
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          options?.errorMessage ||
          'An unexpected error occurred';
        error(msg);
        throw err;
      }
    },
    [success, error]
  );

  return { toasts, addToast, removeToast, success, error, warning, info, handlePromise };
}
