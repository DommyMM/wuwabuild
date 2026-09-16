// Browser and SSR traffic both go through the configured Cloudflare Worker gateway

const LB_DEFAULT = 'http://localhost:8080';
const OCR_DEFAULT = 'http://localhost:5000';

/** Env values must be full origins including the scheme, e.g. "https://api.wuwa.build" */
function base(value: string | undefined, fallback: string): string {
  const v = value?.trim().replace(/\/+$/, '');
  return v || fallback;
}

/** Base URL for all LB requests, reads and writes alike */
export const LB_API_BASE = base(process.env.NEXT_PUBLIC_LB_URL, LB_DEFAULT);

const OCR_BASE = base(process.env.NEXT_PUBLIC_OCR_URL, OCR_DEFAULT);

/** POST the original image as FormData or raw bytes */
export const OCR_POST_URL = `${OCR_BASE}/api/ocr`;

/** POST metadata plus the optional original image as FormData */
export const OCR_REPORT_URL = `${OCR_BASE}/api/report-ocr-issue`;

/** GET, also used to wake a sleeping Railway service */
export const OCR_HEALTH_URL = `${OCR_BASE}/health`;
