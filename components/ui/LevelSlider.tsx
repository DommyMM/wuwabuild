'use client';

import React, { useState, useCallback, useRef, useMemo } from 'react';

interface LevelSliderProps {
  value: number;
  onLevelChange: (level: number) => void;
  min?: number;
  max?: number;
  snapValues?: number[];
  label?: string;
  showDiamonds?: boolean;
  showBreakpoints?: boolean;
  className?: string;
}

// Default snap values for character/weapon levels
const DEFAULT_SNAP_VALUES = [1, 20, 40, 50, 60, 70, 80, 90];

export const LevelSlider: React.FC<LevelSliderProps> = ({
  value,
  onLevelChange,
  min = 1,
  max = 90,
  snapValues = DEFAULT_SNAP_VALUES,
  label = 'Level',
  showDiamonds = true,
  showBreakpoints = true,
  className = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const previousValueRef = useRef(value);

  // Get diamond/ascension level based on current level
  const getDiamondLevel = useCallback((level: number): number => {
    if (level <= 20) return 0;
    if (level <= 40) return 1;
    if (level <= 50) return 2;
    if (level <= 60) return 3;
    if (level <= 70) return 4;
    if (level <= 80) return 5;
    return 6;
  }, []);

  // Snap to closest breakpoint value
  const snapToClosestValue = useCallback((rawValue: number): number => {
    return snapValues.reduce((closest, current) =>
      Math.abs(current - rawValue) < Math.abs(closest - rawValue) ? current : closest
    , snapValues[0]);
  }, [snapValues]);

  // Handle slider change
  const handleSliderChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = snapToClosestValue(parseInt(event.target.value));
    onLevelChange(newValue);
  }, [snapToClosestValue, onLevelChange]);

  // Handle direct input change
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  }, []);

  // Finalize level from input
  const finalizeLevelFromInput = useCallback(() => {
    if (inputValue.trim() === '') {
      onLevelChange(previousValueRef.current);
    } else {
      let typedValue = parseInt(inputValue, 10);
      if (isNaN(typedValue) || typedValue < min) typedValue = min;
      if (typedValue > max) typedValue = max;
      onLevelChange(typedValue);
    }
    setIsEditing(false);
  }, [inputValue, min, max, onLevelChange]);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      finalizeLevelFromInput();
    } else if (event.key === 'Escape') {
      onLevelChange(previousValueRef.current);
      setIsEditing(false);
    }
  }, [finalizeLevelFromInput, onLevelChange]);

  // Start editing mode
  const startEditing = useCallback(() => {
    previousValueRef.current = value;
    setInputValue('');
    setIsEditing(true);
  }, [value]);

  // Calculate gradient percentage for slider track
  const valuePercentage = useMemo(() => ((value - min) / (max - min)) * 100, [value, min, max]);

  const diamondLevel = getDiamondLevel(value);

  return (
    <div className={`flex flex-col gap-2 mb-4 ${className}`}>
      {/* Label + value (inline) */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-text-primary/80">{label}</span>
        {isEditing ? (
          <input
            type="number"
            min={min}
            max={max}
            value={inputValue}
            placeholder={value.toString()}
            className="w-16 rounded-md border border-accent bg-background px-2 py-1 text-center text-sm font-semibold text-accent focus:outline-none"
            onChange={handleInputChange}
            onBlur={finalizeLevelFromInput}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        ) : (
          <button
            onClick={startEditing}
            className="min-w-12 rounded-md border border-border bg-background px-2.5 py-1 text-center text-sm font-semibold text-accent transition-colors hover:border-accent"
          >
            {value}
          </button>
        )}
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={handleSliderChange}
          className="level-slider h-2 w-full cursor-pointer appearance-none rounded-full bg-border"
          style={{
            background: `linear-gradient(to right, #a69662 0%, #bfad7d ${valuePercentage}%, #333333 ${valuePercentage}%)`
          }}
        />
      </div>

      {/* Diamond indicators for ascension */}
      {showDiamonds && (
        <div className="flex items-center justify-center gap-1">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className={`h-2.5 w-2.5 rotate-45 border transition-colors ${
                index < diamondLevel
                  ? 'border-accent bg-accent'
                  : 'border-border bg-transparent'
              }`}
            />
          ))}
        </div>
      )}

      {/* Breakpoint markers */}
      {showBreakpoints && (
        <div className="flex justify-between px-0.5 text-xs text-text-primary/50">
          {snapValues.filter((_, i) => i % 2 === 0 || i === snapValues.length - 1).map((snapValue) => (
            <span key={snapValue}>{snapValue}</span>
          ))}
        </div>
      )}
    </div>
  );
};

export default LevelSlider;
