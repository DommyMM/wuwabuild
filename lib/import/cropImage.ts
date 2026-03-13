import type { ImportRegion } from './types';

// Read DPI from a PNG file's pHYs chunk (client-side, first 512 bytes only).
// Returns the DPI value if the chunk specifies meters as the unit, otherwise null.
export async function getImageDpi(file: File): Promise<number | null> {
  const buf = await file.slice(0, 512).arrayBuffer();
  const view = new DataView(buf);
  // Check PNG signature
  if (view.getUint32(0) !== 0x89504e47) return null;
  let offset = 8;
  while (offset + 12 <= buf.byteLength) {
    const chunkLen  = view.getUint32(offset);
    const chunkType = String.fromCharCode(
      view.getUint8(offset + 4), view.getUint8(offset + 5),
      view.getUint8(offset + 6), view.getUint8(offset + 7),
    );
    if (chunkType === 'pHYs' && chunkLen === 9) {
      const ppuX = view.getUint32(offset + 8);
      const unit = view.getUint8(offset + 16);
      if (unit === 1) return Math.round(ppuX / 39.3701); // pixels per metre → DPI
      return null; // unit unknown (not metre)
    }
    if (chunkType === 'IDAT' || chunkType === 'IEND') break;
    offset += 12 + chunkLen;
  }
  return null;
}

// Load a File into an HTMLImageElement
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

// Crop a region (normalized 0–1 coords) → base64 PNG string
export function cropImageToRegion(
  img: HTMLImageElement,
  region: ImportRegion
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const w = img.naturalWidth;
    const h = img.naturalHeight;

    const x = Math.round(region.x1 * w);
    const y = Math.round(region.y1 * h);
    const cropW = Math.round((region.x2 - region.x1) * w);
    const cropH = Math.round((region.y2 - region.y1) * h);

    canvas.width = cropW;
    canvas.height = cropH;

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, x, y, cropW, cropH, 0, 0, cropW, cropH);

    resolve(canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, ''));
  });
}

// Normalize any accepted image file into a JPEG payload for durable storage.
export async function encodeImageFileAsJpegBase64(
  file: File,
  quality = 0.92,
): Promise<string> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to prepare image for upload');
  }

  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/jpeg', quality).replace(/^data:image\/jpeg;base64,/, '');
}
