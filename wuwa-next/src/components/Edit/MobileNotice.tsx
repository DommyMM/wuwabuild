'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const MobileNotice: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const width = window.screen.width;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsMobile(width < 1200 && isTouchDevice);
    };

    checkMobile();
    setTimeout(() => setIsVisible(true), 100);
    const timer = setTimeout(() => setIsDismissed(true), 7000);
    
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
      clearTimeout(timer);
    };
  }, []);

  if (!isMobile || isDismissed) return null;

  return (
    <div className={`mobile-notice${isVisible ? ' visible' : ''}`}>
      <button 
        className="mobile-notice-close"
        onClick={() => setIsDismissed(true)}
      >
        <X size={24} />
      </button>
      <div className="mobile-notice-title">
        Small Screen Detected
      </div>
      <span className="mobile-notice-text">
        Content will scroll sideways → <br />
        Use computer for best experience
      </span>
    </div>
  );
};

export default MobileNotice;