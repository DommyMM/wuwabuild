import React, { useCallback, useState } from 'react';

interface ImagePreviewProps {
  src: string;
  category?: string;
  details?: string;
  isLoading?: boolean;
  error?: boolean;
  errorMessage?: string;
}

interface ImageUploaderProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  src, category, details, isLoading, error, errorMessage
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const getErrorMessage = () => {
    if (!errorMessage) return 'Unable to analyze';
    if (errorMessage.includes('Rate limit')) {
      return 'Server busy - please wait';
    }
    if (errorMessage.includes('timeout')) {
      return 'Request timed out';
    }
    return errorMessage;
  };

  return (
    <>
      <div className="image-container">
        <img 
          src={src} 
          className="preview-thumbnail"
          alt="Preview" 
          onClick={() => setIsFullscreen(true)}
        />
        <div className={`category-label ${isLoading ? 'loading' : ''} ${error ? 'error' : ''}`}>
          {isLoading ? (
            <>
              <div className="loading-spinner" />
              <span>Analyzing...</span>
            </>
          ) : error ? (
            <div className="error-message">
              {getErrorMessage()}
            </div>
          ) : category ? (
            <>
              <div>Detected: {category}</div>
              {details && <div className="details">{details}</div>}
            </>
          ) : null}
        </div>
      </div>
      {isFullscreen && (
        <div 
          className="fullscreen-overlay"
          onClick={() => setIsFullscreen(false)}
        >
          <img 
            src={src} 
            className="modal-image"
            alt="Preview"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  onFilesSelected,
  disabled = false 
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(e.type === 'dragover');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  }, [onFilesSelected, disabled]);

  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled) return;
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
  }, [onFilesSelected, disabled]);

  return (
    <div
      className={`dropzone ${isDragging ? 'dragover' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={() => !disabled && document.getElementById('fileInput')?.click()}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      <span>{disabled ? 'Processing...' : 'Drag, Upload or Paste'}</span>
      <input
        id="fileInput"
        type="file"
        multiple
        hidden
        disabled={disabled}
        onChange={(e) => onFilesSelected(Array.from(e.target.files || []))}
      />
    </div>
  );
};