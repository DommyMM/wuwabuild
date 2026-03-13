import 'server-only';

import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createHash } from 'crypto';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export interface TrainingImageUploadResult {
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

export function decodeBase64Image(image: string): Buffer {
  const normalized = image.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
  return Buffer.from(normalized, 'base64');
}

export function isJpeg(buffer: Buffer): boolean {
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

export function getTrainingImageKey(imageBuffer: Buffer): string {
  return `${createHash('sha256').update(imageBuffer).digest('hex').substring(0, 16)}.jpg`;
}

export async function uploadTrainingImage(image: string): Promise<TrainingImageUploadResult> {
  if (!isR2Configured()) {
    return { success: false, reason: 'R2 not configured' };
  }

  const imageBuffer = decodeBase64Image(image);
  if (!isJpeg(imageBuffer)) {
    return { success: false, reason: 'invalid image type' };
  }

  const bucketName = getRequiredBucketName();
  const key = getTrainingImageKey(imageBuffer);

  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      }),
    );
    return { success: true, key, deduplicated: true };
  } catch {
    // Not found; upload below.
  }

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: imageBuffer,
      ContentType: 'image/jpeg',
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
