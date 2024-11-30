import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const MobileNotice: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isMobileWidth = window.innerWidth < 1800;
      const isPortrait = window.matchMedia("(orientation: portrait)").matches;
      setIsMobile(isTouchDevice && isMobileWidth && isPortrait);
    };

    checkMobile();
    setTimeout(() => setIsVisible(true), 100);
    
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    window.matchMedia("(orientation: portrait)").addEventListener('change', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
      window.matchMedia("(orientation: portrait)").removeEventListener('change', checkMobile);
    };
  }, []);

  if (!isMobile || isDismissed) return null;

  return (
    <div className={`mobile-notice${isVisible ? ' visible' : ''}`} onClick={() => setIsDismissed(true)}>
      <button 
        className="mobile-notice-close"
        onClick={(e) => {
          e.stopPropagation();
          setIsDismissed(true);
        }}
      >
        <X size={32} />
      </button>
      <div className="mobile-notice-title">Desktop Version Only</div>
      <span className="mobile-notice-text">
        {window.innerWidth > 1200 ? 
          "Please rotate your device to landscape mode" : 
          "Please use a desktop browser"}
      </span>
      <span className="mobile-notice-info">
        Current size: {window.innerWidth}x{window.innerHeight}px
        <br />
        Orientation: {window.matchMedia("(orientation: portrait)").matches ? "Portrait" : "Landscape"}
      </span>
    </div>
  );
};

export default MobileNotice;