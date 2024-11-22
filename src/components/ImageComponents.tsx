import React from 'react';

interface ImagePreviewProps {
  src: string;
  category?: string;
  isLoading?: boolean;
  error?: boolean;
  onClick: () => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  src, category, isLoading, error, onClick
}) => (
  <div className="image-container">
    <img src={src} className="preview-image" onClick={onClick} alt="Preview" />
    <div className={`category-label ${isLoading ? 'loading' : ''} ${error ? 'error' : ''}`}>
      {isLoading ? (
        <>
          <div className="loading-spinner" />
          <span>Analyzing...</span>
        </>
      ) : error ? 'Unable to analyze' 
        : category ? `Detected: ${category}` 
        : null}
    </div>
  </div>
);

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCategorySelect: (category: string) => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen, onClose, imageSrc, onCategorySelect
}) => {
  if (!isOpen) return null;
  
  const categories = ['Stats', 'Weapon', 'Sequences', 'Forte', 'Echo'];

  return (
    <div className="category-modal" style={{ display: isOpen ? 'flex' : 'none' }} onClick={onClose}>
      <div className="category-modal-content" onClick={e => e.stopPropagation()}>
        <span className="close" onClick={onClose}>&times;</span>
        <img className="category-modal-image" src={imageSrc} alt="Selected" />
        <div className="category-modal-categories">
          {categories.map(category => (
            <button key={category} className="category-btn" onClick={() => onCategorySelect(category)}>
              {category}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};