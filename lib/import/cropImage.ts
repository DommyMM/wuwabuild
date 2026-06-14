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
