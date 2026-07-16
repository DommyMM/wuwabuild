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
  const { toCanvas } = await import('html-to-image');

  // Card controls update immediately before export. Give React and the browser
  // two frames to commit the non-editing state before cloning the DOM.
  await waitForAnimationFrame();
  await waitForAnimationFrame();

  const style: Partial<CSSStyleDeclaration> = {
    maxWidth: `${BUILD_CARD_DESIGN_WIDTH}px`,
    minWidth: `${BUILD_CARD_DESIGN_WIDTH}px`,
    width: `${BUILD_CARD_DESIGN_WIDTH}px`,
  };
  if (options.height !== undefined) {
    const height = `${options.height}px`;
    style.height = height;
    style.maxHeight = height;
    style.minHeight = height;
  }

  const canvas = await toCanvas(node, {
    height: options.height,
    pixelRatio: BUILD_CARD_EXPORT_WIDTH / BUILD_CARD_DESIGN_WIDTH,
    style,
    width: BUILD_CARD_DESIGN_WIDTH,
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
