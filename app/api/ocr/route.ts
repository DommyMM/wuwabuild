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
  const res = await fetch(`${OCR_API}/api/ocr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
