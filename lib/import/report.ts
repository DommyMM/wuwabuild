export type RegionStatus = 'pending' | 'done' | 'error';

export type OcrIssueReason =
  | 'illegal_echo'
  | 'ocr_error'
  | 'validation_error'
  | 'manual_report';

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
