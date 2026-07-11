import 'server-only';

import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createHash } from 'crypto';
import { MAX_OCR_IMAGE_BYTES } from '@/lib/ingestIdentity';

const MAX_BASE64_IMAGE_LENGTH = Math.ceil(MAX_OCR_IMAGE_BYTES * 4 / 3) + 128;

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

interface TrainingImageUploadResult {
  success: boolean;
  key?: string;
  deduplicated?: boolean;
  reason?: string;
}

function getRequiredBucketName(): string {
  const bucketName = process.env.R2_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('R2 bucket is not configured.');
  }
  return bucketName;
}

export function isR2Configured(): boolean {
  return Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME,
  );
}

function decodeBase64Image(image: string): Buffer {
  const normalized = image.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
  return Buffer.from(normalized, 'base64');
}

function isJpeg(buffer: Buffer): boolean {
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

function isPng(buffer: Buffer): boolean {
  return buffer.length >= 8
    && buffer[0] === 0x89
    && buffer[1] === 0x50
    && buffer[2] === 0x4e
    && buffer[3] === 0x47
    && buffer[4] === 0x0d
    && buffer[5] === 0x0a
    && buffer[6] === 0x1a
    && buffer[7] === 0x0a;
}

function getImageFormat(imageBuffer: Buffer): { extension: 'jpg' | 'png'; contentType: string } | null {
  if (isJpeg(imageBuffer)) return { extension: 'jpg', contentType: 'image/jpeg' };
  if (isPng(imageBuffer)) return { extension: 'png', contentType: 'image/png' };
  return null;
}

function isNotFoundError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return candidate.name === 'NotFound'
    || candidate.name === 'NoSuchKey'
    || candidate.$metadata?.httpStatusCode === 404;
}

export async function uploadTrainingImage(image: string): Promise<TrainingImageUploadResult> {
  if (!isR2Configured()) {
    return { success: false, reason: 'R2 not configured' };
  }
  if (image.length > MAX_BASE64_IMAGE_LENGTH) {
    return { success: false, reason: 'image too large' };
  }

  const imageBuffer = decodeBase64Image(image);
  if (imageBuffer.length === 0 || imageBuffer.length > MAX_OCR_IMAGE_BYTES) {
    return { success: false, reason: 'invalid image size' };
  }

  const format = getImageFormat(imageBuffer);
  if (!format) {
    return { success: false, reason: 'invalid image type' };
  }

  const bucketName = getRequiredBucketName();
  const digest = createHash('sha256').update(imageBuffer).digest('hex');
  const key = `${digest}.${format.extension}`;

  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      }),
    );
    return { success: true, key, deduplicated: true };
  } catch (error) {
    if (!isNotFoundError(error)) throw error;
  }

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: imageBuffer,
      ContentType: format.contentType,
      ContentMD5: createHash('md5').update(imageBuffer).digest('base64'),
      Metadata: { sha256: digest },
    }),
  );

  return { success: true, key, deduplicated: false };
}

export async function putJsonObject(key: string, data: unknown): Promise<void> {
  if (!isR2Configured()) {
    throw new Error('R2 not configured');
  }

  await s3Client.send(
    new PutObjectCommand({
      Bucket: getRequiredBucketName(),
      Key: key,
      Body: JSON.stringify(data, null, 2),
      ContentType: 'application/json; charset=utf-8',
    }),
  );
}

export function buildReportObjectKey(reportId: string, date = new Date()): string {
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `reports/${year}/${month}/${day}/${reportId}.json`;
}
