export async function POST(req: Request) {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    return Response.json({ success: false, reason: 'R2 not configured' }, { status: 200 });
  }

  try {
    const { image } = await req.json() as { image: string };
    const bytes = Buffer.from(image, 'base64');

    // Validate PNG dimensions from header bytes (PNG: 8-byte sig, then IHDR chunk)
    // PNG sig: 89 50 4E 47 0D 0A 1A 0A, then 4 bytes length, IHDR, 4 bytes W, 4 bytes H
    if (bytes.length < 24 ||
        bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4E || bytes[3] !== 0x47) {
      return Response.json({ success: false, reason: 'not a PNG' }, { status: 200 });
    }
    const width  = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    if (width !== 1920 || height !== 1080) {
      return Response.json({ success: false, reason: 'wrong dimensions' }, { status: 200 });
    }

    // SHA-256 hash-based key for deduplication
    const hashBuf = await crypto.subtle.digest('SHA-256', bytes);
    const hash = Buffer.from(hashBuf).toString('hex');
    const key = `training/${hash}.png`;

    // PUT to Cloudflare R2 using S3-compatible API
    const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${key}`;
    await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/png',
        'Authorization': `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}`,
      },
      body: bytes,
      signal: AbortSignal.timeout(30_000),
    });

    return Response.json({ success: true });
  } catch {
    return Response.json({ success: false }, { status: 200 });
  }
}
