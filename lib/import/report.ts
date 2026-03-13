import type { SavedState } from '@/lib/build';
import type { AnalysisData } from './types';
import type { RegionKey } from './regions';

export type RegionStatus = 'pending' | 'done' | 'error';

export type OcrIssueReason =
  | 'illegal_echo'
  | 'ocr_error'
  | 'validation_error'
  | 'manual_report';

export interface OcrIssueReportPayload {
  note?: string;
  route: '/import';
  reason: OcrIssueReason;
  trainingImageKey?: string;
  image?: string;
  progress: Record<RegionKey, RegionStatus>;
  analysisData: AnalysisData;
  importedState?: SavedState;
  validationError?: string | null;
  ocrError?: string | null;
  lbUploadError?: string | null;
  uploadToLb: boolean;
  watermark?: {
    username?: string;
    uid?: string;
  };
  client: {
    url: string;
    userAgent: string;
    submittedAt: string;
  };
}

export function getDefaultReportReason(args: {
  validationError?: string | null;
  ocrError?: string | null;
  lbUploadError?: string | null;
}): OcrIssueReason {
  if (args.lbUploadError) return 'illegal_echo';
  if (args.ocrError) return 'ocr_error';
  if (args.validationError) return 'validation_error';
  return 'manual_report';
}
