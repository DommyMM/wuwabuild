import { buildReportObjectKey, isR2Configured, putJsonObject, uploadTrainingImage } from '@/lib/server/r2';
import type { OcrIssueReason } from '@/lib/import/report';
import { canonicalScanIdOrNull, canonicalSourceImageKeyOrNull } from '@/lib/ingestIdentity';

interface ReportRequestBody {
  note?: string;
  route?: string;
  reason?: string;
  scanId?: string;
  trainingImageKey?: string;
  image?: string;
  progress?: Record<string, string>;
  analysisData?: unknown;
  importedState?: unknown;
  validationError?: string | null;
  ocrError?: string | null;
  lbUploadError?: string | null;
  uploadToLb?: boolean;
  watermark?: {
    username?: string;
    uid?: string;
  };
  client?: {
    url?: string;
    userAgent?: string;
    submittedAt?: string;
  };
}

function normalizeReason(value: string | undefined): OcrIssueReason | null {
  if (value === 'illegal_echo' || value === 'ocr_error' || value === 'validation_error' || value === 'manual_report') {
    return value;
  }
  return null;
}

function isProgressRecord(value: unknown): value is Record<string, string> {
  return typeof value === 'object' && value !== null;
}

export async function POST(req: Request) {
  if (!isR2Configured()) {
    return Response.json({ success: false, reason: 'R2 not configured' }, { status: 503 });
  }

  try {
    const body = (await req.json()) as ReportRequestBody;
    const reason = normalizeReason(body.reason);

    if (body.route !== '/import') {
      return Response.json({ success: false, reason: 'invalid route' }, { status: 400 });
    }
    if (!reason) {
      return Response.json({ success: false, reason: 'invalid reason' }, { status: 400 });
    }
    if (!isProgressRecord(body.progress)) {
      return Response.json({ success: false, reason: 'invalid progress' }, { status: 400 });
    }
    const providedScanId = typeof body.scanId === 'string' ? body.scanId.trim() : '';
    const scanId = canonicalScanIdOrNull(providedScanId);
    if (providedScanId && !scanId) {
      return Response.json({ success: false, reason: 'invalid scan ID' }, { status: 400 });
    }
    const providedImageKey = typeof body.trainingImageKey === 'string'
      ? body.trainingImageKey.trim()
      : '';
    const confirmedImageKey = canonicalSourceImageKeyOrNull(providedImageKey);
    if (providedImageKey && !confirmedImageKey) {
      return Response.json({ success: false, reason: 'invalid image reference' }, { status: 400 });
    }
    const fallbackImage = typeof body.image === 'string' && body.image ? body.image : '';
    if (!confirmedImageKey && !fallbackImage) {
      return Response.json({ success: false, reason: 'missing image reference' }, { status: 400 });
    }

    let trainingImageKey = confirmedImageKey ?? '';

    if (!trainingImageKey && fallbackImage) {
      const uploadResult = await uploadTrainingImage(fallbackImage);
      if (!uploadResult.success || !uploadResult.key) {
        return Response.json(
          { success: false, reason: uploadResult.reason ?? 'failed to upload image' },
          { status: 400 },
        );
      }
      trainingImageKey = uploadResult.key;
    }

    const reportId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const reportKey = buildReportObjectKey(reportId);

    const reportPayload = {
      schemaVersion: 1,
      reportId,
      createdAt,
      source: 'import',
      scanId,
      reason,
      note: typeof body.note === 'string' ? body.note.trim() : '',
      trainingImageKey: trainingImageKey || null,
      route: '/import',
      uploadToLb: Boolean(body.uploadToLb),
      watermark: {
        username: typeof body.watermark?.username === 'string' ? body.watermark.username : '',
        uid: typeof body.watermark?.uid === 'string' ? body.watermark.uid : '',
      },
      errors: {
        validationError: typeof body.validationError === 'string' ? body.validationError : null,
        ocrError: typeof body.ocrError === 'string' ? body.ocrError : null,
        lbUploadError: typeof body.lbUploadError === 'string' ? body.lbUploadError : null,
      },
      progress: body.progress,
      analysisData: body.analysisData ?? null,
      importedState: body.importedState ?? null,
      client: {
        url: typeof body.client?.url === 'string' ? body.client.url : '',
        userAgent: typeof body.client?.userAgent === 'string' ? body.client.userAgent : '',
        submittedAt: typeof body.client?.submittedAt === 'string' ? body.client.submittedAt : createdAt,
      },
    };

    await putJsonObject(reportKey, reportPayload);

    return Response.json({
      success: true,
      reportId,
      reportKey,
      trainingImageKey: trainingImageKey || null,
    });
  } catch (error) {
    console.error('Failed to persist OCR issue report:', error);
    return Response.json({ success: false, reason: 'report submit failed' }, { status: 500 });
  }
}
