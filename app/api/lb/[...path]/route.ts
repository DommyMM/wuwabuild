const LB_API = process.env.LB_URL?.trim();
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY?.trim();

function buildHeaders(contentType?: string): HeadersInit {
  const headers: HeadersInit = {};

  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  headers['X-Internal-Key'] = INTERNAL_API_KEY!;

  return headers;
}

async function proxyRequest(
  req: Request,
  context: { params: Promise<{ path: string[] }> },
  method: 'GET' | 'POST',
) {
  if (!LB_API) {
    return Response.json({ error: 'LB_URL is not configured.' }, { status: 500 });
  }
  if (!INTERNAL_API_KEY) {
    return Response.json({ error: 'INTERNAL_API_KEY is not configured.' }, { status: 500 });
  }

  const { path } = await context.params;
  const normalizedPath = Array.isArray(path) ? path.join('/') : '';
  const search = new URL(req.url).search;
  const targetUrl = `${LB_API}/${normalizedPath}${search}`;

  const body = method === 'POST' ? await req.text() : undefined;
  const res = await fetch(targetUrl, {
    method,
    headers: buildHeaders(method === 'POST' ? 'application/json' : undefined),
    body,
    signal: AbortSignal.timeout(30_000),
    cache: 'no-store',
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}

export async function GET(
  req: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(req, context, 'GET');
}

export async function POST(
  req: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(req, context, 'POST');
}
