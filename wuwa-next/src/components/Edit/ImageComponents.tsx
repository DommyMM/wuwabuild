'use client';

import React, { useCallback, useState, useEffect } from 'react';
import '@/styles/ImageComponents.css';

interface ImagePreviewProps {
  src: string;
  category?: string;
  details?: string;
  isLoading?: boolean;
  error?: boolean;
  errorMessage?: string;
  status: 'uploading' | 'ready' | 'processing' | 'queued' | 'complete' | 'error';
  onDelete?: () => void;
}

interface ImageUploaderProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  src, category, details, status, error, errorMessage, onDelete
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const getStatusMessage = () => {
    return (
      <div className="category-content">
        {category && <div className="type-line">Detected: {category}</div>}
        <div className="status-line">
          {(() => {
            switch (status) {
              case 'uploading':
                return (
                  <div className="loading-container">
                    <div className="loading-spinner" />
                    <span>Uploading...</span>
                  </div>
                );
              case 'ready':
                return <div>Ready to Process</div>;
              case 'processing':
                return (
                  <div className="loading-container">
                    <div className="loading-spinner" />
                    <span>Processing...</span>
                  </div>
                );
              case 'queued':
                return (
                  <div className="loading-container">
                    <div className="loading-spinner" />
                    <span>Queued...</span>
                  </div>
                );
              case 'complete':
                return <div className="details">{details}</div>;
              case 'error':
                return <div className="error-message">{errorMessage || 'Error'}</div>;
            }
          })()}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="image-container">
        {onDelete && (
          <button className="delete-button"
            onClick={onDelete}
          >
            ×
          </button>
        )}
        <img 
          src={src} 
          className="preview-thumbnail"
          alt="Preview" 
          onClick={() => setIsFullscreen(true)}
        />
        <div className={`category-label ${status}`}>
          {getStatusMessage()}
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
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        disabled={disabled}
        onChange={(e) => onFilesSelected(Array.from(e.target.files || []))}
      />
    </div>
  );
};