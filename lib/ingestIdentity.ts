const SOURCE_IMAGE_KEY_PATTERN = /^[a-f0-9]{64}\.(?:jpg|png)$/;
const SCAN_ID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

export const MAX_OCR_IMAGE_BYTES = 5 * 1024 * 1024;

export function canonicalSourceImageKeyOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const key = value.trim();
  return SOURCE_IMAGE_KEY_PATTERN.test(key) ? key : null;
}

export function canonicalScanIdOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const scanId = value.trim().toLowerCase();
  return SCAN_ID_PATTERN.test(scanId) ? scanId : null;
}
