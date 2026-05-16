export function unwrapOcrAnalysisPayload(payload: unknown, context: string): unknown {
  if (payload === null || typeof payload !== 'object') {
    throw new Error(`${context} returned an invalid OCR response`);
  }

  const body = payload as {
    success?: unknown;
    analysis?: unknown;
    error?: unknown;
  };

  if (body.success === false) {
    const message = typeof body.error === 'string' && body.error.trim()
      ? body.error
      : `${context} failed`;
    throw new Error(message);
  }

  if ('analysis' in body) {
    if (body.analysis === null || body.analysis === undefined) {
      throw new Error(`${context} returned no analysis`);
    }
    return body.analysis;
  }

  return payload;
}
