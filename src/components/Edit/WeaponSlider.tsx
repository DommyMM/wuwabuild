'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Slider from '@mui/material/Slider';
import { styled } from '@mui/material/styles';
import '@/styles/WeaponSlider.css';

const CIRCLE_RADIUS = 81;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
const MAX_ROTATION = 125;
const MIN_ROTATION = -2;

interface WeaponSliderProps {
  level: number;
  rank: number;
  onLevelChange: (level: number) => void;
  onRankChange: (rank: number) => void;
}

const RankSlider = styled(Slider)(() => ({
  color: 'transparent',
  height: 90,
  '& .MuiSlider-thumb': {
    height: 24,
    width: 24,
    backgroundColor: '#a69662',
    border: '1px solid rgba(57, 55, 53)',
    color: 'white',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'grab',
    '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
      boxShadow: 'inherit',
    },
    '&:active': {
      cursor: 'grabbing',
      backgroundColor: '#8a7b4e',
    },
    '&:before': {
      display: 'none',
    },
  },
  '& .MuiSlider-valueLabel': {
    padding: 0,
    width: 20,
    height: 20,
    borderRadius: '50%',
    backgroundColor: '#a69662',
    '&::before': { 
      display: 'none' 
    },
    '&.MuiSlider-valueLabelOpen': {
      transform: 'translate(29px, -10px)',
    }
  },
  '& .MuiSlider-track': {
    border: 'none',
    height: 5,
    background: 'linear-gradient(to top, #a9eeff, #9d3be9, #edd72b)',
  },
  '& .MuiSlider-rail': {
    opacity: 0.5,
    backgroundColor: '#d0d0d0',
    borderRadius: '15px'
  }
}));

const LevelMobileSlider = styled(Slider)(() => ({
  color: 'transparent',
  height: 150, 
  '& .MuiSlider-thumb': {
    height: 24,
    width: 24,
    backgroundColor: '#a69662',
    border: '1px solid rgba(57, 55, 53)',
    color: 'white',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'grab',
    '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
      boxShadow: 'inherit',
    },
    '&:active': {
      cursor: 'grabbing',
      backgroundColor: '#8a7b4e',
    },
    '&:before': {
      display: 'none',
    },
  },
  '& .MuiSlider-valueLabel': {
    padding: 0,
    width: 20,
    height: 20,
    borderRadius: '50%',
    backgroundColor: '#a69662',
    '&::before': { 
      display: 'none' 
    },
    '&.MuiSlider-valueLabelOpen': {
      transform: 'translate(29px, -10px)',
    }
  },
  '& .MuiSlider-track': {
    border: 'none',
    height: 5,
    background: 'linear-gradient(to top, #a9eeff, #9d3be9, #edd72b)',
  },
  '& .MuiSlider-rail': {
    opacity: 0.5,
    backgroundColor: '#d0d0d0',
    borderRadius: '15px'
  }
}));

export const WeaponSlider: React.FC<WeaponSliderProps> = ({
  level = 1,
  rank = 1,
  onLevelChange,
  onRankChange,
}) => {
  const circleRef = useRef<SVGCircleElement>(null);
  const levelButtonRef = useRef<HTMLDivElement>(null);
  const [isLevelDragging, setIsLevelDragging] = useState(false);
  const getLevelButtonTransform = useCallback((value: number, angle: number) => {
    const rotation = value < 30 ? 90 : value > 69 ? -30 : 0;
    return `translate(-50%, -50%) rotate(${angle}deg) translate(${CIRCLE_RADIUS}px) rotate(${rotation}deg)`;
  }, []);
  const getCircleProgress = useCallback((percent: number) => {
    return CIRCLE_CIRCUMFERENCE - (CIRCLE_CIRCUMFERENCE * 0.34 * percent);
  }, []);
  const handleLevelDrag = useCallback((e: MouseEvent) => {
    if (!isLevelDragging || !circleRef.current || !levelButtonRef.current) return;
    const rect = circleRef.current.getBoundingClientRect();
    const center = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    const angle = Math.atan2(center.y - e.clientY, e.clientX - center.x) * 180 / Math.PI;
    let rotation = (90 - angle + 360) % 360;
    if (rotation > 300) rotation = MIN_ROTATION;
    rotation = Math.min(Math.max(rotation, MIN_ROTATION), MAX_ROTATION);
    const progress = Math.max(0, (rotation + Math.abs(MIN_ROTATION)) / (MAX_ROTATION + Math.abs(MIN_ROTATION)));
    const newLevel = Math.round(progress * 89 + 1);
    circleRef.current.style.strokeDashoffset = `${getCircleProgress(progress)}`;
    const buttonAngle = rotation - 92;
    levelButtonRef.current.style.transform = getLevelButtonTransform(newLevel, buttonAngle);
    onLevelChange(newLevel);
  }, [isLevelDragging, onLevelChange, getLevelButtonTransform, getCircleProgress]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      handleLevelDrag(e);
    };
    const handleMouseUp = () => {
      setIsLevelDragging(false);
    };
    if (isLevelDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isLevelDragging, handleLevelDrag]);

  useEffect(() => {
    if (circleRef.current && levelButtonRef.current) {
      const progress = (level - 1) / 89;
      const rotation = progress * MAX_ROTATION + MIN_ROTATION;
      circleRef.current.style.strokeDashoffset = `${getCircleProgress(progress)}`;
      levelButtonRef.current.style.transform = getLevelButtonTransform(level, rotation - 92);
    }
  }, [level, getLevelButtonTransform, getCircleProgress]);

  return (
    <>
    <div className='rank-container'>
      <RankSlider
        orientation="vertical"
        aria-label="Rank"
        value={rank}
        onChange={(event, newValue) => onRankChange(newValue as number)}
        valueLabelDisplay="on"
        min={1}
        max={5}
      />
    </div>
      <div className="circular-slider">
        <div ref={levelButtonRef} className={`control-button ${isLevelDragging ? 'dragging' : ''}`} onMouseDown={() => setIsLevelDragging(true)}>
          {level}
        </div>
        <svg className="progress-bar" width="173" height="173">
          <circle className="progress-circle" cx="87" cy="87" r={CIRCLE_RADIUS} />
          <circle ref={circleRef} className="progress-circle" cx="87" cy="87" r={CIRCLE_RADIUS}
            style={{
              stroke: 'url(#gradient)',
              strokeWidth: '9px',
              strokeLinecap: 'round',
              strokeDasharray: CIRCLE_CIRCUMFERENCE,
              strokeDashoffset: CIRCLE_CIRCUMFERENCE,
            }}
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%">
              <stop offset="0%" style={{ stopColor: '#a9eeff' }} />
              <stop offset="50%" style={{ stopColor: '#9d3be9' }} />
              <stop offset="100%" style={{ stopColor: '#edd72b' }} />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="level-mobile">
        <LevelMobileSlider
          orientation="vertical"
          aria-label="Level"
          value={level}
          onChange={(event, newValue) => onLevelChange(newValue as number)}
          valueLabelDisplay="on"
          min={1}
          max={90}
        />
      </div>
    </>
  );
};