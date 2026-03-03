'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useReducer } from 'react';
import { AnimatePresence, motion } from 'motion/react';
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

interface ToastRuntimeItem extends ToastItem {
  remaining: number;
  startedAt: number | null;
  paused: boolean;
}

interface ToastState {
  visible: ToastRuntimeItem[];
  queue: ToastRuntimeItem[];
}

type ToastAction =
  | { type: 'enqueue'; toast: ToastRuntimeItem }
  | { type: 'dismiss'; id: string }
  | { type: 'pause'; id: string }
  | { type: 'resume'; id: string }
  | { type: 'pause_all' }
  | { type: 'resume_all' };

const DEFAULT_TOAST_DURATION = 4500;
const MIN_TOAST_DURATION = 1500;
const MAX_VISIBLE_TOASTS = 2;

const ToastContext = createContext<ToastContextValue | null>(null);

function getToastStyles(type: ToastType): { container: string; icon: string } {
  if (type === 'success') {
    return {
      container: 'border-emerald-400/45 bg-emerald-500/12 text-emerald-100 shadow-[0_10px_30px_-12px_rgba(16,185,129,0.5)]',
      icon: 'bg-emerald-300/20 text-emerald-100',
    };
  }
  if (type === 'error') {
    return {
      container: 'border-red-400/45 bg-red-500/12 text-red-100 shadow-[0_10px_30px_-12px_rgba(239,68,68,0.5)]',
      icon: 'bg-red-300/20 text-red-100',
    };
  }
  if (type === 'warning') {
    return {
      container: 'border-amber-400/45 bg-amber-500/12 text-amber-100 shadow-[0_10px_30px_-12px_rgba(245,158,11,0.5)]',
      icon: 'bg-amber-300/20 text-amber-100',
    };
  }
  return {
    container: 'border-border/90 bg-background-secondary/95 text-text-primary shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]',
    icon: 'bg-background/55 text-text-primary',
  };
}

function ToastIcon({ type }: { type: ToastType }) {
  if (type === 'success') return <CheckCircle2 size={16} />;
  if (type === 'error') return <AlertCircle size={16} />;
  if (type === 'warning') return <AlertTriangle size={16} />;
  return <Info size={16} />;
}

function activateToast(toast: ToastRuntimeItem, now: number): ToastRuntimeItem {
  return {
    ...toast,
    startedAt: now,
    paused: false,
  };
}

function promoteQueuedToasts(state: ToastState, now: number): ToastState {
  if (state.visible.length >= MAX_VISIBLE_TOASTS || state.queue.length === 0) {
    return state;
  }

  const visible = [...state.visible];
  const queue = [...state.queue];

  while (visible.length < MAX_VISIBLE_TOASTS && queue.length > 0) {
    const nextQueued = queue.shift();
    if (!nextQueued) break;
    visible.push(activateToast(nextQueued, now));
  }

  return { visible, queue };
}

function pauseToast(toast: ToastRuntimeItem, now: number): ToastRuntimeItem {
  if (toast.paused) return toast;
  const elapsed = toast.startedAt ? now - toast.startedAt : 0;

  return {
    ...toast,
    remaining: Math.max(0, toast.remaining - elapsed),
    startedAt: null,
    paused: true,
  };
}

function resumeToast(toast: ToastRuntimeItem, now: number): ToastRuntimeItem {
  if (!toast.paused || toast.remaining <= 0) return toast;

  return {
    ...toast,
    startedAt: now,
    paused: false,
  };
}

function toastReducer(state: ToastState, action: ToastAction): ToastState {
  const now = Date.now();

  if (action.type === 'enqueue') {
    if (state.visible.length < MAX_VISIBLE_TOASTS) {
      return {
        ...state,
        visible: [...state.visible, activateToast(action.toast, now)],
      };
    }

    return {
      ...state,
      queue: [...state.queue, action.toast],
    };
  }

  if (action.type === 'dismiss') {
    const visible = state.visible.filter((toast) => toast.id !== action.id);
    const queue = state.queue.filter((toast) => toast.id !== action.id);
    return promoteQueuedToasts({ visible, queue }, now);
  }

  if (action.type === 'pause') {
    return {
      ...state,
      visible: state.visible.map((toast) => (
        toast.id === action.id ? pauseToast(toast, now) : toast
      )),
    };
  }

  if (action.type === 'resume') {
    return {
      ...state,
      visible: state.visible.map((toast) => (
        toast.id === action.id ? resumeToast(toast, now) : toast
      )),
    };
  }

  if (action.type === 'pause_all') {
    return {
      ...state,
      visible: state.visible.map((toast) => pauseToast(toast, now)),
    };
  }

  if (action.type === 'resume_all') {
    return {
      ...state,
      visible: state.visible.map((toast) => resumeToast(toast, now)),
    };
  }

  return state;
}

function sanitizeDuration(duration?: number): number {
  if (!Number.isFinite(duration)) return DEFAULT_TOAST_DURATION;
  return Math.max(MIN_TOAST_DURATION, Number(duration));
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(toastReducer, { visible: [], queue: [] });
  const toastCounter = useRef(0);
  const timeoutIdsRef = useRef<Map<string, number>>(new Map());

  const dismissToast = useCallback((id: string) => {
    dispatch({ type: 'dismiss', id });
  }, []);

  const showToast = useCallback((input: ToastInput) => {
    toastCounter.current += 1;
    const id = `toast-${toastCounter.current}`;
    const duration = sanitizeDuration(input.duration);

    dispatch({
      type: 'enqueue',
      toast: {
        id,
        type: input.type,
        message: input.message,
        duration,
        remaining: duration,
        startedAt: null,
        paused: true,
      },
    });
  }, []);

  const pauseToastById = useCallback((id: string) => {
    dispatch({ type: 'pause', id });
  }, []);

  const resumeToastById = useCallback((id: string) => {
    dispatch({ type: 'resume', id });
  }, []);

  useEffect(() => {
    const visibleIds = new Set(state.visible.map((toast) => toast.id));

    timeoutIdsRef.current.forEach((timeoutId, id) => {
      if (!visibleIds.has(id)) {
        window.clearTimeout(timeoutId);
        timeoutIdsRef.current.delete(id);
      }
    });

    state.visible.forEach((toast) => {
      const existingTimeout = timeoutIdsRef.current.get(toast.id);

      if (toast.paused || toast.remaining <= 0) {
        if (existingTimeout) {
          window.clearTimeout(existingTimeout);
          timeoutIdsRef.current.delete(toast.id);
        }
        if (toast.remaining <= 0) {
          dismissToast(toast.id);
        }
        return;
      }

      if (!existingTimeout) {
        const timeoutId = window.setTimeout(() => {
          dismissToast(toast.id);
        }, toast.remaining);
        timeoutIdsRef.current.set(toast.id, timeoutId);
      }
    });
  }, [dismissToast, state.visible]);

  useEffect(() => {
    const handleBlur = () => dispatch({ type: 'pause_all' });
    const handleFocus = () => dispatch({ type: 'resume_all' });

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => (
    () => {
      timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutIdsRef.current.clear();
    }
  ), []);

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
        aria-atomic="false"
        aria-relevant="additions text"
        className="pointer-events-none fixed inset-x-0 bottom-3 z-95 flex flex-col items-center gap-2 px-3 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:items-end sm:px-0"
      >
        <ul className="flex w-full max-w-md flex-col gap-2">
          <AnimatePresence initial={false}>
            {state.visible.map((toast) => {
              const styles = getToastStyles(toast.type);
              return (
                <motion.li
                  key={toast.id}
                  layout
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 36, mass: 0.7 }}
                  onMouseEnter={() => pauseToastById(toast.id)}
                  onMouseLeave={() => resumeToastById(toast.id)}
                  className={`pointer-events-auto rounded-xl border backdrop-blur-md ${styles.container}`}
                >
                  <div className="flex items-center gap-3 px-3.5 py-3">
                    <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${styles.icon}`}>
                      <ToastIcon type={toast.type} />
                    </span>
                    <p className="min-w-0 flex-1 text-base leading-snug">
                      {toast.message}
                    </p>
                    <button
                      onClick={() => dismissToast(toast.id)}
                      className="rounded-md p-1.5 text-current/75 transition-colors hover:bg-black/20 hover:text-current"
                      aria-label="Dismiss notification"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
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
