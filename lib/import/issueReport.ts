import { canonicalScanIdOrNull, canonicalSourceImageKeyOrNull } from '@/lib/ingestIdentity';
import type { SavedState } from '@/lib/build';
import type { OcrIssueReason, RegionStatus } from './report';
import type { AnalysisData } from './types';

const MAX_OCR_ISSUE_REPORT_BYTES = 256 * 1024;

interface OcrIssueReportPayload {
  note: string;
  route: '/import';
  reason: OcrIssueReason;
  scanId?: string;
  trainingImageKey?: string;
  progress: Record<string, RegionStatus>;
  analysisData: AnalysisData;
  importedState?: SavedState;
  validationError: string | null;
  ocrError: string | null;
  lbUploadError: string | null;
  uploadToLb: boolean;
  watermark: {
    username: string;
    uid: string;
  };
  client: {
    url: string;
    userAgent: string;
    submittedAt: string;
  };
}

export function buildOcrIssueReportForm(
  payload: OcrIssueReportPayload,
  fallbackImage: File | null,
): FormData {
  const rawScanId = payload.scanId?.trim();
  const scanId = canonicalScanIdOrNull(rawScanId);
  if (rawScanId && !scanId) throw new Error('OCR scan ID is malformed.');

  const rawImageKey = payload.trainingImageKey?.trim();
  const trainingImageKey = canonicalSourceImageKeyOrNull(rawImageKey);
  if (rawImageKey && !trainingImageKey) {
    throw new Error('Source image key is not canonical.');
  }
  if (Boolean(trainingImageKey) === Boolean(fallbackImage)) {
    throw new Error('Issue reports require either a confirmed image key or the original screenshot.');
  }

  const report = JSON.stringify({
    ...payload,
    schemaVersion: 1,
    scanId: scanId ?? undefined,
    trainingImageKey: trainingImageKey ?? undefined,
  });
  if (new TextEncoder().encode(report).byteLength > MAX_OCR_ISSUE_REPORT_BYTES) {
    throw new Error('Issue report details exceed the 256 KiB limit.');
  }

  const form = new FormData();
  form.append('report', report);
  if (fallbackImage) {
    form.append('image', fallbackImage, fallbackImage.name || 'ocr-card');
  }
  return form;
}
