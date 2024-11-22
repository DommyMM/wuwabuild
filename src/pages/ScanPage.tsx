import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ImageUploader } from '../components/ImageUploader';
import { ImagePreview, CategoryModal } from '../components/ImageComponents';
import '../styles/Scan.css';
import '../styles/App.css';

interface ImageData {
  id: string;
  file: File;
  preview: string;
  category?: string;
  isLoading?: boolean;
  error?: string;
}

interface OCRResponse {
  success: boolean;
  analysis?: {
    type: string;
  };
  error?: string;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(new Error('File reading failed: ' + error));
    reader.readAsDataURL(file);
  });
};

export const ScanPage: React.FC = () => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);

  useEffect(() => {
    const previews = images.map(img => img.preview);
    return () => previews.forEach(URL.revokeObjectURL);
  }, [images]);

  const handleFiles = async (files: File[]) => {
    const newImages = files.map(file => ({
      id: Math.random().toString(36),
      file,
      preview: URL.createObjectURL(file),
      isLoading: true,
      error: undefined
    }));
    setImages(prev => [...prev, ...newImages]);
    for (const image of newImages) {
      await processImage(image);
    }
  };

  const processImage = async (image: ImageData) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('http://localhost:5000/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: await fileToBase64(image.file) }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const result: OCRResponse = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'OCR processing failed');
      }

      setImages(prev => prev.map(img => 
        img.id === image.id ? 
          { ...img, category: result.analysis?.type, isLoading: false } : 
          img
      ));
    } catch (error) {
      setImages(prev => prev.map(img =>
        img.id === image.id ? 
          { ...img, error: error instanceof Error ? error.message : 'Unknown error', isLoading: false } : 
          img
      ));
    }
  };

  return (
    <div className="scan-page">
      <Link to="/edit" className="tab">Edit</Link>
      <h2>Upload Images</h2>
      <ImageUploader onFilesSelected={handleFiles} />
      <div className="file-preview">
        {images.map(image => (
          <ImagePreview
            key={image.id}
            src={image.preview}
            category={image.category}
            isLoading={image.isLoading}
            error={!!image.error}
            onClick={() => setSelectedImage(image)}
          />
        ))}
      </div>
      <canvas id="canvas" width="400" height="200" style={{ display: 'none' }} />
      <CategoryModal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        imageSrc={selectedImage?.preview || ''}
        onCategorySelect={(category) => {
          if (selectedImage) {
            setImages(prev => prev.map(img =>
              img.id === selectedImage.id ? { ...img, category } : img
            ));
            setSelectedImage(null);
          }
        }}
      />
    </div>
  );
};