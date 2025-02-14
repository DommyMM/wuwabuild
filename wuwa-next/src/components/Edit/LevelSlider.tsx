'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';

interface LevelSliderProps {
  value: number;
  onLevelChange: (level: number) => void;
  ocrLevel?: string;
}

export const LevelSlider: React.FC<LevelSliderProps> = ({ 
  value, 
  onLevelChange, 
  ocrLevel 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [lastOcrLevel, setLastOcrLevel] = useState<string | undefined>();
  const previousValueRef = useRef(value);
  const snapValues = useMemo(() => [1, 20, 40, 50, 60, 70, 80, 90], []);

  useEffect(() => {
    if (value === 1) {
      setLastOcrLevel(undefined);
    }
  }, [value]);

  useEffect(() => {
    if (ocrLevel && 
        ocrLevel !== lastOcrLevel && 
        parseInt(ocrLevel) !== value) {
      setLastOcrLevel(ocrLevel);
      onLevelChange(parseInt(ocrLevel));
    }
  }, [ocrLevel, lastOcrLevel, value, onLevelChange]);

  const getDiamondLevel = (level: number) => {
    if (level <= 20) return 0;
    if (level <= 40) return 1;
    if (level <= 50) return 2;
    if (level <= 60) return 3;
    if (level <= 70) return 4;
    if (level <= 80) return 5;
    return 6;
  };

  const snapToClosestValue = useCallback((value: number) => {
    let closest = snapValues[0];
    for (let snap of snapValues) {
      if (Math.abs(snap - value) < Math.abs(closest - value)) {
        closest = snap;
      }
    }
    return closest;
  }, [snapValues]);

  const handleSliderChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = snapToClosestValue(parseInt(event.target.value));
    onLevelChange(newValue);
  }, [snapToClosestValue, onLevelChange]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const finalizeLevelFromInput = () => {
    if (inputValue.trim() === '') {
      onLevelChange(previousValueRef.current);
    } else {
      let typedValue = parseInt(inputValue, 10);
      if (isNaN(typedValue) || typedValue < 1) typedValue = 1;
      if (typedValue > 90) typedValue = 90;
      onLevelChange(typedValue);
    }
    setIsEditing(false);
  };

  const handleInputKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      finalizeLevelFromInput();
    }
  };

  const startEditing = () => {
    previousValueRef.current = value;
    setInputValue('');
    setIsEditing(true);
  };

  const valuePercentage = (value / 90) * 100;
  const gradientBackground = `linear-gradient(to right, #ffd700 0%, #ff8c00 ${valuePercentage}%, #d3d3d3 ${valuePercentage}%)`;

  return (
    <div className="character-level-container">
      <span className="level-label">Level</span>
      <div className="slider-group">
        <input
          type="range"
          min="1"
          max="90"
          value={value}
          className="character-slider"
          onChange={handleSliderChange}
          style={{ background: gradientBackground }}
        />
        {isEditing ? (
          <input
            type="number"
            min="1"
            max="90"
            value={inputValue}
            className="level-input"
            onChange={handleInputChange}
            onBlur={finalizeLevelFromInput}
            onKeyPress={handleInputKeyPress}
            autoFocus
          />
        ) : (
          <div className="character-level-value" onClick={startEditing}>
            {value}
          </div>
        )}
      </div>
      <div className="star-container">
        <div className="star-background">
          <img 
            src="images/Resources/Level.png"
            alt="Star Background"
            className="star-background-image"
          />
          <div className="diamond-container">
            {[...Array(6)].map((_, index) => (
              <div
                key={index}
                className={`diamond ${index < getDiamondLevel(value) ? 'filled' : ''}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};