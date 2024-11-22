import React, { useCallback, useState } from 'react';

interface ImageUploaderProps {
  onFilesSelected: (files: File[]) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onFilesSelected }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(e.type === 'dragover');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    onFilesSelected(Array.from(e.dataTransfer.files));
  }, [onFilesSelected]);

  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles = Array.from(items)
        .filter(item => item.type.startsWith('image/'))
        .map(item => item.getAsFile())
        .filter((file): file is File => file !== null);

      if (imageFiles.length > 0) {
        onFilesSelected(imageFiles);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [onFilesSelected]);

  return (
    <div
      className={`dropzone ${isDragging ? 'dragover' : ''}`}
      onClick={() => document.getElementById('fileInput')?.click()}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      <span>Drag, Upload or Paste</span>
      <input
        id="fileInput"
        type="file"
        multiple
        hidden
        onChange={(e) => onFilesSelected(Array.from(e.target.files || []))}
      />
    </div>
  );
};