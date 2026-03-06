import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'crypto';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

function isJpeg(buffer: Buffer): boolean {
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff; // JPEG MIME bytes
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
    const { image } = (await req.json()) as { image: string };

    if (!image) {
      return Response.json({ success: false, reason: 'missing image' }, { status: 200 });
    }

    const imageBuffer = Buffer.from(image, 'base64');

    if (!isJpeg(imageBuffer)) {
      return Response.json({ success: false, reason: 'invalid image type' }, { status: 200 });
    }

    const filename =
      createHash('sha256').update(imageBuffer).digest('hex').substring(0, 16) + '.jpg';

    try {
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: filename,
        })
      );
      return Response.json({ success: true, filename, deduplicated: true });
    } catch {
      // not found, proceed
    }

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: filename,
        Body: imageBuffer,
        ContentType: 'image/jpeg',
      })
    );

    return Response.json({ success: true, filename, deduplicated: false });
  } catch {
    return Response.json({ success: false }, { status: 200 });
  }
}