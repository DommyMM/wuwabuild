const OCR_API = process.env.API_URL ?? 'http://localhost:5000';

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
  const headerRegion = req.headers.get('x-ocr-region')?.trim();
  const bodyRegion = typeof body?.region === 'string' ? body.region.trim() : '';
  const legacyType = typeof body?.type === 'string' ? body.type.trim() : '';
  const legacyRegion = legacyType.startsWith('import-') ? legacyType.slice('import-'.length).trim() : '';
  const region = headerRegion || bodyRegion || legacyRegion;

  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (region) headers['X-OCR-Region'] = region;

  const payload = {
    image: body?.image,
    region: region || undefined,
  };

  const res = await fetch(`${OCR_API}/api/ocr`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60_000),
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
