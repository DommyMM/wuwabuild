const OCR_API = process.env.API_URL ?? 'http://localhost:5000';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

function getClientIp(req: Request): string | undefined {
  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',', 1)[0]?.trim();
  if (forwardedFor) return forwardedFor;

  const realIp = req.headers.get('x-real-ip')?.trim();
  return realIp || undefined;
}

export async function GET() {
  try {
    const res = await fetch(`${OCR_API}/health`, {
      signal: AbortSignal.timeout(5_000),
    });
    return Response.json({ ok: res.ok }, { status: res.status });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const region = req.headers.get('x-ocr-region')?.trim();

  if (!region) {
    return Response.json(
      { success: false, error: 'Missing OCR region. Send X-OCR-Region.' },
      { status: 400 },
    );
  }

  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  headers['X-OCR-Region'] = region;

  if (INTERNAL_API_KEY) {
    headers['X-Internal-Key'] = INTERNAL_API_KEY;
  }

  const clientIp = getClientIp(req);
  if (clientIp) {
    headers['X-OCR-Client-IP'] = clientIp;
  }

  const payload = {
    image: body?.image,
  };

  const res = await fetch(`${OCR_API}/api/ocr`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(9_000),
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
