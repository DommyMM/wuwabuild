'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

type ConfirmTone = 'default' | 'accent' | 'destructive';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  cancelLabel?: string;
  confirmLabel?: string;
  onConfirm?: () => void;
  confirmTone?: ConfirmTone;
  actions?: React.ReactNode;
}

function getConfirmButtonClass(tone: ConfirmTone): string {
  if (tone === 'destructive') {
    return 'bg-red-500/15 border border-red-500/45 text-red-300 hover:bg-red-500/25 hover:border-red-500/70';
  }
  if (tone === 'accent') {
    return 'bg-accent text-background hover:bg-accent-hover';
  }
  return 'border border-border text-text-primary hover:border-text-primary/30';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  icon,
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  onConfirm,
  confirmTone = 'default',
  actions,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={false}
      fitContent
      contentClassName="w-full max-w-sm"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0 text-yellow-400">
            {icon ?? <AlertTriangle className="h-5 w-5" />}
          </div>
          <div>
            <p className="font-semibold text-text-primary">{title}</p>
            {description && (
              <div className="mt-1 text-sm text-text-primary/65">
                {description}
              </div>
            )}
          </div>
        </div>

        {actions ?? (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onClose}
              className="w-full rounded-xl border border-border py-2 text-sm font-semibold text-text-primary/75 transition-colors hover:border-text-primary/30 hover:text-text-primary"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={`w-full rounded-xl py-2 text-sm font-semibold transition-colors ${getConfirmButtonClass(confirmTone)}`}
            >
              {confirmLabel}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

