import React, { useState, useRef, useEffect, useMemo } from 'react';

interface WeaponSliderProps {
  level: number;
  rank: number;
  onLevelChange: (level: number) => void;
  onRankChange: (rank: number) => void;
}

export const WeaponSlider: React.FC<WeaponSliderProps> = ({
  level = 1,
  rank = 1,
  onLevelChange,
  onRankChange
}) => {
  const circleRef = useRef<SVGCircleElement>(null);
  const controlButtonRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const draggerRef = useRef<HTMLDivElement>(null);

  const [isCircleDragging, setIsCircleDragging] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [circleValue, setCircleValue] = useState(level);
  const [draggerValue, setDraggerValue] = useState(rank);

  const calculations = useMemo(() => ({
    getCircleTransform: (value: number, angle: number) => {
      const rotation = value < 30 ? 90 : value > 69 ? -30 : 0;
      return `translate(-50%, -50%) rotate(${angle}deg) translate(81px) rotate(${rotation}deg)`;
    },
    getProgressOffset: (percent: number) => `${502.4 - 170 * percent}`,
  }), []);

  const dragHandlers = useMemo(() => ({
    handleCircleDrag: (e: MouseEvent) => {
      if (!isCircleDragging || !circleRef.current || !controlButtonRef.current) return;

      const rect = circleRef.current.getBoundingClientRect();
      const centerX = rect.left + (173 / 2);
      const centerY = rect.top + (173 / 2);

      const deltaX = e.clientX - centerX;
      const deltaY = centerY - e.clientY;
      const angleRad = Math.atan2(deltaY, deltaX);
      let angleDeg = (angleRad * 180) / Math.PI;

      let rotationAngle = (90 - angleDeg + 360) % 360;
      if (rotationAngle > 300) rotationAngle = -2;
      
      rotationAngle = Math.min(Math.max(rotationAngle, -2), 125);
      let progressPercent = Math.max(0, (rotationAngle + 2) / 127);
      
      circleRef.current.style.strokeDashoffset = calculations.getProgressOffset(progressPercent);

      const newCircleValue = Math.round(progressPercent * 89 + 1);
      if (newCircleValue !== circleValue) {
        setCircleValue(newCircleValue);
        onLevelChange(newCircleValue);
      }

      rotationAngle -= 92;
      controlButtonRef.current.style.transform = calculations.getCircleTransform(newCircleValue, rotationAngle);
    },
    handleDraggerDrag: (e: MouseEvent) => {
      if (!isDragging || !progressRef.current || !draggerRef.current) return;

      const rect = progressRef.current.getBoundingClientRect();
      const clickY = rect.bottom - e.clientY;
      const percentage = (clickY / rect.height) * 100;
      const constrainedPercentage = Math.min(Math.max(percentage, 0), 90);
      
      const value = 1 + (4 * constrainedPercentage / 90);
      const roundedValue = Math.min(Math.max(Math.round(value), 1), 5);
      
      draggerRef.current.style.bottom = `${constrainedPercentage}%`;
      
      const progressFill = progressRef.current.querySelector('#progress-fill');
      if (progressFill instanceof HTMLElement) {
        progressFill.style.height = `${constrainedPercentage}%`;
      }

      if (roundedValue !== draggerValue) {
        setDraggerValue(roundedValue);
        onRankChange(roundedValue);
      }
    }
  }), [isCircleDragging, isDragging, circleValue, draggerValue, onLevelChange, onRankChange, calculations, circleRef, controlButtonRef, progressRef, draggerRef]);

  const mouseHandlers = useMemo(() => ({
    handleMouseMove: (e: MouseEvent) => {
      if (isCircleDragging) dragHandlers.handleCircleDrag(e);
      if (isDragging) dragHandlers.handleDraggerDrag(e);
    },
    handleMouseUp: () => {
      setIsCircleDragging(false);
      setIsDragging(false);
    }
  }), [isCircleDragging, isDragging, dragHandlers]);

  useEffect(() => {
    if (isCircleDragging || isDragging) {
      window.addEventListener('mousemove', mouseHandlers.handleMouseMove);
      window.addEventListener('mouseup', mouseHandlers.handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', mouseHandlers.handleMouseMove);
      window.removeEventListener('mouseup', mouseHandlers.handleMouseUp);
    };
  }, [isCircleDragging, isDragging, mouseHandlers]);

  useEffect(() => {
    if (circleRef.current && controlButtonRef.current) {
      const progressPercent = (level - 1) / 89;
      const rotationAngle = progressPercent * 127 - 2;
      
      circleRef.current.style.strokeDashoffset = calculations.getProgressOffset(progressPercent);
      
      const adjustedRotation = rotationAngle - 92;
      controlButtonRef.current.style.transform = calculations.getCircleTransform(level, adjustedRotation);
    }
    setCircleValue(level);
  }, [level, calculations, circleRef, controlButtonRef]);

  useEffect(() => {
    if (progressRef.current && draggerRef.current) {
      const percentage = ((rank - 1) / 4) * 90;
      draggerRef.current.style.bottom = `${percentage}%`;
      
      const progressFill = progressRef.current.querySelector('#progress-fill');
      if (progressFill instanceof HTMLElement) {
        progressFill.style.height = `${percentage}%`;
      }
    }
    setDraggerValue(rank);
  }, [rank, progressRef, draggerRef]);

  return (
    <>
      <div className="progress-container" ref={progressRef}>
        <div id="progress-fill"></div>
        <div 
          ref={draggerRef}
          className="dragger" 
          onMouseDown={(e) => {
            setIsDragging(true);
            e.preventDefault();
          }}
        >
          {draggerValue}
        </div>
      </div>

      <div className="slider">
        <div 
          ref={controlButtonRef}
          className="control-button"
          onMouseDown={(e) => {
            setIsCircleDragging(true);
            e.preventDefault();
          }}
        >
          {circleValue}
        </div>
        <svg className="progress-bar" width="173" height="173">
          <circle className="progress-circle" cx="87" cy="87" r="81" />
          <circle 
            ref={circleRef}
            id="circle2"
            className="progress-circle" 
            cx="87" 
            cy="87" 
            r="81"
            style={{
              stroke: 'url(#gradient)',
              strokeWidth: '9px',
              strokeLinecap: 'round',
              strokeDasharray: '502.4',
              strokeDashoffset: '502.4'
            }}
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{stopColor: '#a9eeff'}} />
              <stop offset="50%" style={{stopColor: '#9d3be9'}} />
              <stop offset="100%" style={{stopColor: '#edd72b'}} />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </>
  );
};