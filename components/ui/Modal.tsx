'use client';

import React, { useEffect, useCallback, useRef, ReactNode } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
  className?: string;
  contentClassName?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  showCloseButton = true,
  closeOnEscape = true,
  closeOnOutsideClick = true,
  className = '',
  contentClassName = ''
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // Handle escape key press
  const handleEscape = useCallback((event: KeyboardEvent) => {
    if (closeOnEscape && event.key === 'Escape') {
      onClose();
    }
  }, [closeOnEscape, onClose]);

  // Handle click outside modal content
  const handleBackdropClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOutsideClick && event.target === event.currentTarget) {
      onClose();
    }
  }, [closeOnOutsideClick, onClose]);

  // Escape listener (gated by closeOnEscape) and body scroll lock (always
  // while open — previously the lock was skipped whenever Escape was disabled,
  // and the cleanup still reset body overflow unconditionally).
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';
    if (closeOnEscape) document.addEventListener('keydown', handleEscape);

    return () => {
      if (closeOnEscape) document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, closeOnEscape, handleEscape]);

  // Focus containment: aria-modal promises it, so deliver it — initial focus
  // moves into the panel, Tab cycles inside it, and focus returns to the
  // opener on close. (The Navigation drawer implements the same contract.)
  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    if (!panel) return;

    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const initial = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (initial ?? panel).focus();

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || !panel.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleTab, true);
    return () => {
      document.removeEventListener('keydown', handleTab, true);
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm ${className}`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative flex max-h-9/10 w-[calc(100vw-1rem)] md:w-auto md:max-w-[90vw] flex-col overflow-hidden rounded-lg border border-border bg-background-secondary shadow-xl outline-none ${contentClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with title and close button */}
        {(title || showCloseButton) && (
          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
            {title && (
              <h2 id="modal-title" className="text-lg font-semibold text-text-primary">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="ml-auto rounded-full p-1 text-text-primary/70 transition-colors hover:bg-border hover:text-text-primary"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        {/* Modal content, scrolls internally */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );
};
