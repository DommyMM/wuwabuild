import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'crypto';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID     || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

function getPngDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4e || buffer[3] !== 0x47) {
    return null;
  }
  return {
    width:  buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

export async function POST(req: Request) {
  if (
    !process.env.CLOUDFLARE_ACCOUNT_ID ||
    !process.env.R2_ACCESS_KEY_ID ||
    !process.env.R2_SECRET_ACCESS_KEY ||
    !process.env.R2_BUCKET_NAME
  ) {
    return Response.json({ success: false, reason: 'R2 not configured' }, { status: 200 });
  }

  try {
    const { image } = await req.json() as { image: string };
    const imageBuffer = Buffer.from(image, 'base64');

    const dimensions = getPngDimensions(imageBuffer);
    if (!dimensions || dimensions.width !== 1920 || dimensions.height !== 1080) {
      return Response.json({ success: false, reason: 'invalid dimensions' }, { status: 200 });
    }

    const filename = createHash('sha256').update(imageBuffer).digest('hex').substring(0, 16) + '.png';

    // Skip upload if already exists (deduplication)
    try {
      await s3Client.send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: filename }));
      return Response.json({ success: true, filename, deduplicated: true });
    } catch { /* not found, proceed with upload */ }

    await s3Client.send(new PutObjectCommand({
      Bucket:      process.env.R2_BUCKET_NAME,
      Key:         filename,
      Body:        imageBuffer,
      ContentType: 'image/png',
    }));

    return Response.json({ success: true, filename, deduplicated: false });
  } catch {
    return Response.json({ success: false }, { status: 200 });
  }
}
