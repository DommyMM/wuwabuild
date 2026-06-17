import { IMPORT_REGION_KEYS, type RegionKey } from './regions';
import type { AnalysisData } from './types';
import type { RegionStatus } from './report';

export interface FullOcrResponse {
  success?: boolean;
  error?: string;
  analysis?: AnalysisData;
  progress?: Partial<Record<RegionKey, RegionStatus>>;
  timings?: Record<string, unknown>;
  trainingImageKey?: string | null;
  /** Backend flag: the card looks like a real build card but its substat names are not English. */
  unsupportedLanguage?: boolean;
}

export type OcrStreamEvent =
  | {
      type: 'meta';
      image?: { width: number; height: number; bytes: number };
      trainingImageKey?: string | null;
    }
  | {
      type: 'region';
      region: RegionKey;
      status: RegionStatus;
      analysis?: unknown;
      error?: string;
      elapsedMs?: number;
    }
  | ({ type: 'done' } & FullOcrResponse)
  | {
      type: 'error';
      success?: false;
      error?: string;
    };

interface OcrStreamHandlers {
  onRegion?: (event: Extract<OcrStreamEvent, { type: 'region' }>) => void;
  onMeta?: (event: Extract<OcrStreamEvent, { type: 'meta' }>) => void;
}

const REGION_KEY_SET = new Set<string>(IMPORT_REGION_KEYS);

export function isRegionKey(value: unknown): value is RegionKey {
  return typeof value === 'string' && REGION_KEY_SET.has(value);
}

export async function readOcrStreamResponse(
  res: Response,
  handlers: OcrStreamHandlers = {},
): Promise<FullOcrResponse> {
  if (!res.body) {
    throw new Error('OCR response did not include a readable stream.');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalPayload: FullOcrResponse | null = null;

  const handleLine = (line: string): FullOcrResponse | null => {
    if (!line.trim()) return null;
    const event = JSON.parse(line) as OcrStreamEvent;

    if (event.type === 'error') {
      throw new Error(event.error || 'OCR failed');
    }

    if (event.type === 'meta') {
      handlers.onMeta?.(event);
      return null;
    }

    if (event.type === 'region') {
      if (isRegionKey(event.region)) {
        handlers.onRegion?.(event);
      }
      return null;
    }

    if (event.type === 'done') {
      return event;
    }

    return null;
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      finalPayload = handleLine(line) ?? finalPayload;
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    finalPayload = handleLine(buffer) ?? finalPayload;
  }

  if (!finalPayload) {
    throw new Error('OCR stream ended before the final result.');
  }
  if (finalPayload.success === false) {
    throw new Error(finalPayload.error || 'OCR failed');
  }
  return finalPayload;
}
