import { uploadTrainingImage } from '@/lib/server/r2';

// Rollback transport only. Normal imports persist the original image in the
// OCR backend and consume its confirmed key from the final NDJSON event.
export async function POST(req: Request) {
  try {
    const { image } = (await req.json()) as { image?: string };

    if (typeof image !== 'string' || !image) {
      return Response.json({ success: false, reason: 'missing image' }, { status: 200 });
    }

    const result = await uploadTrainingImage(image);
    return Response.json(result, { status: 200 });
  } catch {
    return Response.json({ success: false, reason: 'upload failed' }, { status: 200 });
  }
}
