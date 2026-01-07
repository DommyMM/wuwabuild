import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

// Expected dimensions for official Discord bot images
const EXPECTED_WIDTH = 1920;
const EXPECTED_HEIGHT = 1080;

// Parse PNG dimensions from buffer (faster than decoding full image)
const getPngDimensions = (buffer: Buffer): { width: number; height: number } | null => {
  // PNG signature: 137 80 78 71 13 10 26 10
  if (buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4e || buffer[3] !== 0x47) {
    return null; // Not a PNG
  }
  // IHDR chunk starts at byte 8, width at 16, height at 20 (big-endian)
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
};

// Initialize S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

// Generate SHA-256 hash of image content for deduplication
const generateImageHash = (imageBuffer: Buffer): string => {
  return createHash('sha256').update(imageBuffer).digest('hex').substring(0, 16);
};

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { image } = body;

    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        { success: false, error: 'No image data provided' },
        { status: 400 }
      );
    }

    // Validate environment variables
    if (
      !process.env.CLOUDFLARE_ACCOUNT_ID ||
      !process.env.R2_ACCESS_KEY_ID ||
      !process.env.R2_SECRET_ACCESS_KEY ||
      !process.env.R2_BUCKET_NAME
    ) {
      console.error('Missing R2 environment variables');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(image, 'base64');

    // Validate image dimensions (must be exactly 1920x1080)
    const dimensions = getPngDimensions(imageBuffer);
    if (!dimensions || dimensions.width !== EXPECTED_WIDTH || dimensions.height !== EXPECTED_HEIGHT) {
      return NextResponse.json(
        { success: false, error: 'Invalid image dimensions (expected 1920x1080 PNG)' },
        { status: 400 }
      );
    }

    // Generate content-based hash for filename (deduplication)
    const hash = generateImageHash(imageBuffer);
    const filename = `${hash}.png`;

    // Check if file already exists (deduplication)
    try {
      await s3Client.send(new HeadObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: filename,
      }));
      // File exists, skip upload
      return NextResponse.json({
        success: true,
        filename,
        message: 'Image already exists (deduplicated)',
        deduplicated: true,
      });
    } catch {
      // File doesn't exist, proceed with upload
    }

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: filename,
      Body: imageBuffer,
      ContentType: 'image/png',
    });

    await s3Client.send(command);

    return NextResponse.json({
      success: true,
      filename,
      message: 'Image uploaded successfully',
      deduplicated: false,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
