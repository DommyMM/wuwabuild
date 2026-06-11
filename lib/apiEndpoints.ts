// Shared API endpoint resolution.
// Browser and SSR traffic both go through the configured Cloudflare Worker gateway.

const LB_DEFAULT = 'http://localhost:8080';
const OCR_DEFAULT = 'http://localhost:5000';

// Values must be full origins including the scheme, e.g. "https://api.wuwa.build".
function base(value: string | undefined, fallback: string): string {
  const v = value?.trim().replace(/\/+$/, '');
  return v || fallback;
}

/** Base URL for all LB requests (reads and writes). */
export const LB_API_BASE = base(process.env.NEXT_PUBLIC_LB_URL, LB_DEFAULT);

const OCR_BASE = base(process.env.NEXT_PUBLIC_OCR_URL, OCR_DEFAULT);

/** OCR analyze endpoint (POST, JSON body + X-OCR-Region header). */
export const OCR_POST_URL = `${OCR_BASE}/api/ocr`;

/** OCR health-check endpoint (GET; also wakes a sleeping Railway service). */
export const OCR_HEALTH_URL = `${OCR_BASE}/health`;
