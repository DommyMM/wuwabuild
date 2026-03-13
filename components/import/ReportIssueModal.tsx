'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import type { OcrIssueReason } from '@/lib/import/report';

interface ReportIssueModalProps {
  isOpen: boolean;
  reason: OcrIssueReason;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (note: string) => Promise<void>;
}

const REASON_LABELS: Record<OcrIssueReason, string> = {
  illegal_echo: 'Illegal echo / OCR mismatch',
  ocr_error: 'OCR request failed',
  validation_error: 'Image validation failed',
  manual_report: 'Something in the scan looks wrong',
};

export function ReportIssueModal({
  isOpen,
  reason,
  isSubmitting,
  onClose,
  onSubmit,
}: ReportIssueModalProps) {
  const [note, setNote] = useState('');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Report Scan Issue"
      contentClassName="w-full max-w-xl"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-yellow-500/25 bg-yellow-500/10 p-3 text-sm text-yellow-200">
          <div className="mb-1 flex items-center gap-2 font-medium text-yellow-100">
            <AlertTriangle className="h-4 w-4" />
            <span>{REASON_LABELS[reason]}</span>
          </div>
          <p>
            This sends the screenshot, OCR output, progress state, and the current import diagnostics to
            WuWaBuilds for debugging.
          </p>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-text-primary">Optional note</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={5}
            maxLength={1000}
            placeholder="Anything that looked wrong in the scan?"
            className="min-h-32 rounded-xl border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent"
          />
          <span className="text-xs text-text-primary/45">{note.length}/1000</span>
        </label>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-primary/70 transition-colors hover:border-text-primary/30 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onSubmit(note)}
            disabled={isSubmitting}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Submitting…' : 'Submit Report'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
