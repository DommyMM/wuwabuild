import React, { useState, useRef, useEffect } from 'react';

interface WeaponSliderProps {
  value: number;
  onLevelChange: (level: number) => void;
}

export const WeaponSlider: React.FC<WeaponSliderProps> = ({ value, onLevelChange }) => {
  const [isCircleDragging, setIsCircleDragging] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentDragPosition, setCurrentDragPosition] = useState(0);
  const [circleValue, setCircleValue] = useState(1);
  const [draggerValue, setDraggerValue] = useState(1);
  
  const circleRef = useRef<SVGCircleElement>(null);
  const controlButtonRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const draggerRef = useRef<HTMLDivElement>(null);

  const updateProgressBar = (value: number) => {
    const heightPercentage = ((value - 1) / 4) * 90;
    
    const progressFill = progressRef.current?.querySelector('#progress-fill');
    if (progressFill instanceof HTMLElement) {
      progressFill.style.height = `${heightPercentage}%`;
    }
    if (draggerRef.current) {
      draggerRef.current.style.bottom = `${heightPercentage}%`;
    }
    setDraggerValue(value);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isCircleDragging && circleRef.current && controlButtonRef.current) {
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
        
        if (circleRef.current) {
          circleRef.current.style.strokeDashoffset = `${502.4 - 170 * progressPercent}`;
        }

        const newCircleValue = Math.round(progressPercent * 89 + 1);
        setCircleValue(newCircleValue);

        rotationAngle -= 92;
        if (controlButtonRef.current) {
          if (newCircleValue < 30) {
            controlButtonRef.current.style.transform = 
              `translate(-50%, -50%) rotate(${rotationAngle}deg) translate(81px) rotate(90deg)`;
          } else if (newCircleValue > 69) {
            controlButtonRef.current.style.transform = 
              `translate(-50%, -50%) rotate(${rotationAngle}deg) translate(81px) rotate(-30deg)`;
          } else {
            controlButtonRef.current.style.transform = 
              `translate(-50%, -50%) rotate(${rotationAngle}deg) translate(81px) rotate(0deg)`;
          }
        }
      }

      if (isDragging && progressRef.current && draggerRef.current) {
        const rect = progressRef.current.getBoundingClientRect();
        const clickY = rect.bottom - e.clientY;
        const percentage = (clickY / rect.height) * 100;
        const constrainedPercentage = Math.min(Math.max(percentage, 0), 90);
        
        const progressFill = progressRef.current.querySelector('#progress-fill');
        if (progressFill instanceof HTMLElement) {
          progressFill.style.height = `${constrainedPercentage}%`;
        }
        draggerRef.current.style.bottom = `${constrainedPercentage}%`;
        
        const newValue = Math.min(Math.max(Math.round((constrainedPercentage / 90) * 4) + 1, 1), 5);
        setDraggerValue(newValue);
      }
    };

    const handleMouseUp = () => {
      setIsCircleDragging(false);
      setIsDragging(false);
    };

    if (isCircleDragging || isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isCircleDragging, isDragging, setCircleValue, setDraggerValue]);

  return (
    <>
      <div 
        className="progress-container" 
        ref={progressRef}
        onClick={(e) => {
          if (e.target === draggerRef.current) return;
          
          const rect = progressRef.current?.getBoundingClientRect();
          if (!rect) return;
          
          const clickY = rect.bottom - e.clientY;
          const percentage = (clickY / rect.height) * 100;
          const constrainedPercentage = Math.min(Math.max(percentage, 0), 90);
          
          const value = Math.min(Math.max(Math.round((constrainedPercentage / 90) * 4) + 1, 1), 5);
          updateProgressBar(value);
        }}
      >
        <div id="progress-fill"></div>
        <div 
          ref={draggerRef}
          className="dragger" 
          contentEditable 
          onMouseDown={(e) => {
            setIsDragging(true);
            setStartY(e.clientY);
            setCurrentDragPosition(parseInt(draggerRef.current?.style.bottom || '0'));
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
          contentEditable
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
              strokeLinecap: 'round'
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