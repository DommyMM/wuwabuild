import React, { useCallback, useState, useEffect } from 'react';
import { Character, getCharacterIconPath, isRover } from '../../types/character';
import { SequenceSection } from './SequenceSection';

interface CharacterSectionProps {
  character: Character;
  level: string;
  isSpectro: boolean;
  currentSequence: number;
  username?: string;
  isEditMode?: boolean;
  onImageChange?: (file: File | undefined) => void;
  customImage?: File; 
  children?: React.ReactNode;
}

export const CharacterSection: React.FC<CharacterSectionProps> = ({ 
  character,
  level = '1',
  isSpectro = false,
  currentSequence,
  username,
  isEditMode = false,
  onImageChange,
  customImage,
  children
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  
  const characterName = isRover(character) 
    ? username || "Rover" 
    : character.name;
  
  const elementValue = isRover(character) 
    ? (isSpectro ? "Spectro" : "Havoc")
    : character.element;

  const handleDrag = useCallback((e: React.DragEvent) => {
    if (!isEditMode) return;
    e.preventDefault();
    setIsDragging(e.type === 'dragover');
  }, [isEditMode]);

  const handleImageChange = useCallback((file: File) => {
    if (onImageChange) {
      onImageChange(file);
    }
  }, [onImageChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    if (!isEditMode) return;
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageChange(file);
    }
  }, [isEditMode, handleImageChange]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageChange(file);
    }
  };

  const handleReset = useCallback(() => {
    setPosition({ x: 0, y: 0 });
    setScale(1);
    
    if (onImageChange) {
      onImageChange(undefined);
    }
  }, [onImageChange]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));

  React.useEffect(() => {
    if (!isEditMode) return;

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFile = Array.from(items)
        .find(item => item.type.startsWith('image/'))
        ?.getAsFile();

      if (imageFile && onImageChange) {
        onImageChange(imageFile);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isEditMode, onImageChange]);

  const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isEditMode) return;
    
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = Math.min(Math.max(e.clientX - dragOffset.x, -100), 100);
    const newY = Math.min(Math.max(e.clientY - dragOffset.y, -100), 100);
    
    setPosition({ x: newX, y: newY });
  }, [isDragging, dragOffset]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove]);

  return (
    <>
      <div 
        className="build-character-section"
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <img 
          src={customImage ? URL.createObjectURL(customImage) : getCharacterIconPath(character)}
          className={`build-character-icon ${isEditMode ? 'editable' : ''}`}
          alt={characterName}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            cursor: isEditMode ? 'move' : 'default'
          }}
          onMouseDown={handleMouseDown}
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
        />
        {isEditMode && (
          <>
            <button className="image-reset-button" onClick={handleReset} title="Reset">
              ×
            </button>
            <div className="image-zoom-controls">
              <button className="image-zoom-button" onClick={handleZoomIn} title="Zoom in">
                +
              </button>
              <button className="image-zoom-button" onClick={handleZoomOut} title="Zoom out">
                -
              </button>
            </div>
          </>
        )}
        {isEditMode && (
          <div 
            className={`character-dropzone ${isDragging ? 'dragover' : ''}`}
            onClick={() => document.getElementById('characterImageUpload')?.click()}>
            <span>Choose, drag or paste image...</span>
            <input
              id="characterImageUpload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}/>
          </div>
        )}
        <SequenceSection
          character={character}
          isSpectro={isSpectro}
          currentSequence={currentSequence}
        />
      </div>

      <div className="build-intro">
        <div className="build-character-name">{characterName}</div>
        <div className="build-character-level">Lv.{level}/90</div>
        <img 
          src={`images/Roles/${character.Role}.png`}
          className="role-icon"
          alt={character.Role}/>
        <img src={`images/Elements/${elementValue}.png`}
          className="element-icon" alt={elementValue}/>
        {children}
      </div>
    </>
  );
};