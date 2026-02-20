'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastInput {
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (input: ToastInput) => void;
  dismissToast: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const DEFAULT_TOAST_DURATION = 2800;

const ToastContext = createContext<ToastContextValue | null>(null);

function getToastStyles(type: ToastType): string {
  if (type === 'success') {
    return 'border-green-500/40 bg-green-500/15 text-green-300';
  }
  if (type === 'error') {
    return 'border-red-500/45 bg-red-500/15 text-red-300';
  }
  if (type === 'warning') {
    return 'border-accent/50 bg-accent/15 text-accent-hover';
  }
  return 'border-border bg-background-secondary text-text-primary';
}

function ToastIcon({ type }: { type: ToastType }) {
  if (type === 'success') return <CheckCircle2 size={16} />;
  if (type === 'error') return <AlertCircle size={16} />;
  if (type === 'warning') return <AlertTriangle size={16} />;
  return <Info size={16} />;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastCounter = useRef(0);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((input: ToastInput) => {
    toastCounter.current += 1;
    const id = `toast-${toastCounter.current}`;
    const next: ToastItem = {
      id,
      type: input.type,
      message: input.message,
      duration: input.duration ?? DEFAULT_TOAST_DURATION
    };

    setToasts((prev) => [...prev, next]);
    window.setTimeout(() => dismissToast(id), next.duration);
  }, [dismissToast]);

  const value = useMemo<ToastContextValue>(() => ({
    showToast,
    dismissToast,
    success: (message, duration) => showToast({ type: 'success', message, duration }),
    error: (message, duration) => showToast({ type: 'error', message, duration }),
    warning: (message, duration) => showToast({ type: 'warning', message, duration }),
    info: (message, duration) => showToast({ type: 'info', message, duration }),
  }), [dismissToast, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed right-4 top-20 z-[70] flex w-[min(92vw,360px)] flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2 shadow-lg backdrop-blur-sm ${getToastStyles(toast.type)}`}
            role="status"
          >
            <span className="mt-0.5 shrink-0">
              <ToastIcon type={toast.type} />
            </span>
            <p className="min-w-0 flex-1 text-sm leading-snug">
              {toast.message}
            </p>
            <button
              onClick={() => dismissToast(toast.id)}
              className="rounded p-0.5 text-current/70 transition-colors hover:bg-background/30 hover:text-current"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

