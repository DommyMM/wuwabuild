import { uploadTrainingImage } from '@/lib/server/r2';

export async function POST(req: Request) {
  try {
    const { image } = (await req.json()) as { image?: string };

    if (!image) {
      return Response.json({ success: false, reason: 'missing image' }, { status: 200 });
    }

    const result = await uploadTrainingImage(image);
    return Response.json(result, { status: 200 });
  } catch {
    return Response.json({ success: false, reason: 'upload failed' }, { status: 200 });
  }
}
