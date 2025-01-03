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
  const [position, setPosition] = useState(
    customImage 
      ? { x: 0, y: 0 }
      : { x: 0, y: -20 }
  );
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
      setPosition({ x: 0, y: 0 });
      setScale(1);
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

  const handlePositionReset = useCallback(() => {
    const defaultPosition = customImage ? { x: 0, y: 0 } : { x: 0, y: -20 };
    setPosition(defaultPosition);
    setScale(1);
  }, [customImage]);

  const handleImageReset = useCallback(() => {
    if (onImageChange) {
      onImageChange(undefined);
    }
  }, [onImageChange]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 1));

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
    
    const newX = Math.min(Math.max(e.clientX - dragOffset.x, -300), 300);
    const newY = Math.min(Math.max(e.clientY - dragOffset.y, -300), 300);
    
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
      <div className="character-display" data-element={elementValue}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        style={{
          '--tx': `${position.x}px`,
          '--ty': `${position.y}px`,
          '--scale': scale
        } as React.CSSProperties}
      >
        {!customImage && (
          <img src={getCharacterIconPath(character)}
            className="character-icon shadow"
            alt="Character Shadow"
          />
        )}
        <img src={getCharacterIconPath(character)}
          className={`character-icon ${isEditMode ? 'editable' : ''}`}
          alt={characterName}
          style={{ cursor: isEditMode ? 'move' : 'default' }}
          onMouseDown={handleMouseDown}
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
        />
        <svg className="fade-overlay" xmlns="http://www.w3.org/2000/svg" width="515" height="620" viewBox="0 0 136.26 152.595" preserveAspectRatio="none">
          <defs>
            <clipPath id="a" clipPathUnits="userSpaceOnUse">
              <path d="M0 0h136.26v157.692H0z" />
            </clipPath>
            <filter id="b" width="1.285" height="1.248" x="-.143" y="-.124" style={{colorInterpolation: 'sRGB'}}>
              <feGaussianBlur stdDeviation="11.948"/>
            </filter>
          </defs>
          <path 
            d="M23.9 133.254C6.144 109.126 10.415 49.44 38.903 23.5 62.722-.756 157.412-35.53 181.544-46.292L-19.41-26.26v211.105l164.577-.979c-16.631-6.196-98.961-26.949-121.267-50.612Z" 
            clipPath="url(#a)" 
            style={{
              opacity: 1,
              mixBlendMode: 'normal',
              fill: '#000',
              fillOpacity: 1,
              stroke: 'none',
              strokeWidth: 0.214241,
              strokeLinecap: 'butt',
              strokeLinejoin: 'miter',
              strokeOpacity: 1,
              filter: 'url(#b)'
            }}
          />
        </svg>
        {isEditMode && (
          <>
            <div className="image-controls">
              <button className="image-control-button" onClick={handleImageReset} title="Remove Image"> X </button>
              <button className="image-control-button" onClick={handlePositionReset} title="Reset Position"> ↺ </button>
            </div>
            <div className="image-zoom-controls">
              <button className="image-zoom-button" onClick={handleZoomIn} title="Zoom in"> + </button>
              <button className="image-zoom-button" onClick={handleZoomOut} title="Zoom out"> - </button>
            </div>
          </>
        )}
        {isEditMode && (
          <div className={`character-dropzone ${isDragging ? 'dragover' : ''}`}
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
      </div>
      
      <SequenceSection character={character} isSpectro={isSpectro} currentSequence={currentSequence} />

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