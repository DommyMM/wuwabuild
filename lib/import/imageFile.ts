// Load a File into an HTMLImageElement.
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

// The normal import path sends the File only to OCR. This raw-byte encoder is
// reserved for the explicit issue-report/rollback fallback when OCR could not
// persist the original bytes itself.
export function encodeImageFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to prepare image for upload'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to prepare image for upload'));
    reader.readAsDataURL(file);
  });
}
