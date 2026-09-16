export const BUILD_CARD_DESIGN_WIDTH = 1440;
export const BUILD_CARD_DESIGN_HEIGHT = BUILD_CARD_DESIGN_WIDTH / 2.4;
export const BUILD_CARD_EXPORT_WIDTH = 3840;

const WEBP_MIME_TYPE = 'image/webp';
const PNG_MIME_TYPE = 'image/png';
const WEBP_QUALITY = 0.98;

type BuildCardExportFormat = 'webp' | 'png';

interface BuildCardExportOptions {
  /** Height in design space, omitted when the capture has variable-height content */
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

  // Card controls update right before export, so two frames let React and the browser commit the non-editing state
  await waitForAnimationFrame();
  await waitForAnimationFrame();

  // snapdom pins every clone to its on-screen width, then rasterizes through an SVG <img> blind to document fonts
  // A face missing from the embed falls back to a wider system font inside those pinned boxes, so text wraps or ellipsizes
  // snapdom awaits document.fonts.ready only inside preCache, never on the toCanvas path, so fonts and images warm up here
  try {
    await document.fonts.ready;
    await preCache(node);
  } catch (error) {
    // A cold capture still produces a file, just at more risk of fallback metrics, so warmup never blocks the download
    console.warn('Build card export warmup failed:', error);
  }

  const exportScale = BUILD_CARD_EXPORT_WIDTH / BUILD_CARD_DESIGN_WIDTH;
  const canvas = await snapdom.toCanvas(node, {
    // The node must already be laid out at BUILD_CARD_DESIGN_WIDTH because snapdom serializes the live DOM with no re-layout
    // Hosts pin that 1440 themselves: CardScaler shrinks with a transform, never a re-layout, phones use a 1440 scroller
    // Dropping the outer transform is what captures the full design-space card at any screen width
    outerTransforms: false,
    // SVG rasterized through an <img> cannot see document fonts, so the faces ship inline
    embedFonts: true,
    // Never downsample card art to on-screen resolution
    compress: false,
    dpr: 1,
    width: BUILD_CARD_EXPORT_WIDTH,
    ...(options.height !== undefined
      ? { height: Math.round(options.height * exportScale) }
      : {}),
  });

  // Canvas encoders silently fall back to PNG on an unsupported type, so the returned MIME type picks the extension
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
