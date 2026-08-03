export const BUILD_CARD_DESIGN_WIDTH = 1440;
export const BUILD_CARD_DESIGN_HEIGHT = BUILD_CARD_DESIGN_WIDTH / 2.4;
export const BUILD_CARD_EXPORT_WIDTH = 3840;

const WEBP_MIME_TYPE = 'image/webp';
const PNG_MIME_TYPE = 'image/png';
const WEBP_QUALITY = 0.98;

type BuildCardExportFormat = 'webp' | 'png';

interface BuildCardExportOptions {
  /** Fixed design-space height. Omit when the capture includes variable-height content. */
  height?: number;
}

export interface BuildCardDownloadResult {
  blob: Blob;
  fileName: string;
  format: BuildCardExportFormat;
}

const waitForAnimationFrame = (): Promise<void> => (
  new Promise((resolve) => requestAnimationFrame(() => resolve()))
);

const encodeCanvas = (
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
): Promise<Blob | null> => (
  new Promise((resolve) => canvas.toBlob(resolve, mimeType, quality))
);

const captureBuildCard = async (
  node: HTMLElement,
  options: BuildCardExportOptions,
): Promise<{ blob: Blob; format: BuildCardExportFormat }> => {
  const { preCache, snapdom } = await import('@zumer/snapdom');

  // Card controls update immediately before export. Give React and the browser
  // two frames to commit the non-editing state before cloning the DOM.
  await waitForAnimationFrame();
  await waitForAnimationFrame();

  // snapdom copies each element's on-screen used width onto the clone and then
  // rasterizes through an SVG <img>, which cannot see document fonts. A face
  // that is missing from the embed renders in a wider system fallback inside
  // boxes pinned to the narrower measurement, so text wraps or ellipsizes even
  // though the geometry is correct. next/font loads every family with
  // display:swap and snapdom awaits document.fonts.ready only inside preCache,
  // never on the toCanvas path — so warm fonts and images here. Regression
  // 2026-08-02: an Android profile download shipped with the stat labels, the
  // flat-stat sub-line and the CV badge each split across two lines.
  try {
    await document.fonts.ready;
    await preCache(node);
  } catch (error) {
    // Best-effort: a cold capture still produces a file, just with more risk of
    // fallback metrics. Never block the download on warmup.
    console.warn('Build card export warmup failed:', error);
  }

  const exportScale = BUILD_CARD_EXPORT_WIDTH / BUILD_CARD_DESIGN_WIDTH;
  const canvas = await snapdom.toCanvas(node, {
    // INVARIANT: the captured node must already be laid out at BUILD_CARD_DESIGN_WIDTH.
    // snapdom serializes computed styles off the live DOM, so unlike the html-to-image
    // path it replaced there is no way to force a design-space re-layout at capture
    // time — whatever width the node has on screen is what ships. Every host is
    // therefore responsible for pinning 1440: CardScaler shrinks with a transform
    // (never a re-layout), and the phone paths use a 1440 horizontal scroller.
    // Stripping the outer transform captures the full design-space card on any screen width.
    outerTransforms: false,
    // SVG rasterized through an <img> can't see document fonts; embed them.
    embedFonts: true,
    // Never downsample card art to on-screen resolution
    compress: false,
    dpr: 1,
    width: BUILD_CARD_EXPORT_WIDTH,
    ...(options.height !== undefined
      ? { height: Math.round(options.height * exportScale) }
      : {}),
  });

  // Canvas encoders fall back to PNG when a requested type is unsupported.
  // Verify the returned MIME type before choosing the filename extension.
  const webpBlob = await encodeCanvas(canvas, WEBP_MIME_TYPE, WEBP_QUALITY);
  if (webpBlob?.type === WEBP_MIME_TYPE) {
    return { blob: webpBlob, format: 'webp' };
  }

  const pngBlob = await encodeCanvas(canvas, PNG_MIME_TYPE);
  if (!pngBlob) throw new Error('Card export returned an empty blob.');
  return { blob: pngBlob, format: 'png' };
};

export const downloadBuildCard = async (
  node: HTMLElement,
  fileNameStem: string,
  options: BuildCardExportOptions = {},
): Promise<BuildCardDownloadResult> => {
  const { blob, format } = await captureBuildCard(node, options);
  const fileName = `${fileNameStem}.${format}`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.download = fileName;
  link.href = url;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);

  return { blob, fileName, format };
};
