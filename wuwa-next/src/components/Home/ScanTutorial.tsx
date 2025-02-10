'use client';
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, CSSProperties } from 'react';
import Image from 'next/image'; // Add this import

const SCREENSHOTS = [
    { title: 'Character', src: '/images/scan-character.webp' },
    { title: 'Weapon', src: '/images/scan-weapon.webp' },
    { title: 'Forte', src: '/images/scan-forte.webp' },
    { title: 'Resonance Chain', src: '/images/scan-resonance.webp' },
    { title: 'Echoes', src: '/images/scan-echo.webp' },
];

const BREAKPOINT = 1200;

export const handleTouchStart = (touchRef: React.RefObject<number>) => (e: React.TouchEvent) => {
    if (touchRef.current !== null) {
        touchRef.current = e.targetTouches[0].clientX;
    }
};

export const handleTouchMove = (
    touchRef: React.RefObject<number>,
    current: number,
    max: number,
    isMobile: boolean
) => (e: React.TouchEvent) => {
    if (!isMobile || touchRef.current === null) return;
    const touchDiff = touchRef.current - e.targetTouches[0].clientX;
    if ((touchDiff > 0 && current < max) || (touchDiff < 0 && current > 0)) {
        e.stopPropagation();
    }
};

export const handleTouchEnd = (
    touchRef: React.RefObject<number>,
    current: number,
    max: number,
    setCurrent: React.Dispatch<React.SetStateAction<number>>,
    isMobile: boolean
) => (e: React.TouchEvent) => {
    if (!isMobile || touchRef.current === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const touchDiff = touchRef.current - touchEnd;
    if (Math.abs(touchDiff) > 50) {
        if (touchDiff > 0 && current < max) {
            setCurrent((prev: number) => prev + 1);
        } else if (touchDiff < 0 && current > 0) {
            setCurrent((prev: number) => prev - 1);
        }
    }
};

export const getStepStyles = (index: number, current: number, isMobile: boolean): CSSProperties => {
    if (isMobile) {
        return {
            transform: `translateX(${100 * (index - current)}%)`,
            transition: 'transform 0.3s ease',
            position: 'absolute',
            left: 0
        };
    }
    return {};
};

export const getScreenshotStyles = (index: number, current: number, isMobile: boolean): CSSProperties => {
    if (isMobile) {
        return {
            transform: `translateX(${100 * (index - current)}%)`,
            transition: 'transform 0.3s ease',
            position: 'absolute',
            left: 0,
            width: '100%'
        };
    }
    return {};
};

export const ScanTutorial: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [currentScreenshot, setCurrentScreenshot] = useState(0);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [containerHeight, setContainerHeight] = useState('64vh');
    const [isMobile, setIsMobile] = useState(false);
    const touchStartRef = useRef<number>(0);
    const screenshotTouchRef = useRef<number>(0);

    const checkMobile = useCallback(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth <= BREAKPOINT;
    }, []);

    useLayoutEffect(() => {
        setIsMobile(checkMobile());
        
        const handleResize = () => {
            const newIsMobile = checkMobile();
            if (newIsMobile !== isMobile) {
                setIsMobile(newIsMobile);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [checkMobile, isMobile]);

    useEffect(() => {
        if (isMobile) {
            const stepHeights: Record<number, string> = {
                0: '63.1vh',
                1: '71.25vh',
                2: '72.5vh'
            };
            setContainerHeight(stepHeights[currentStep as keyof typeof stepHeights]);
        }
    }, [currentStep, isMobile]);

    return (
        <div className="scan-tutorial">
            <section className="screenshot-guide">
                <h3>Screenshot Guide</h3>
                <div className="screenshot-grid"
                    onTouchStart={handleTouchStart(screenshotTouchRef)}
                    onTouchMove={handleTouchMove(screenshotTouchRef, currentScreenshot, 4, isMobile)}
                    onTouchEnd={handleTouchEnd(screenshotTouchRef, currentScreenshot, 4, setCurrentScreenshot, isMobile)}
                    style={{ 
                        touchAction: 'pan-y pinch-zoom',
                        position: isMobile ? 'relative' : 'static',
                        height: isMobile ? '300px' : 'auto',
                        overflow: isMobile ? 'hidden' : 'visible'
                    }}
                >
                    {SCREENSHOTS.map((screenshot, index) => (
                        <div key={index} className="screenshot-type" style={getScreenshotStyles(index, currentScreenshot, isMobile)}>
                            <h4>{screenshot.title}</h4>
                            <Image 
                                src={screenshot.src}
                                alt={`${screenshot.title} Screenshot`}
                                width={1920}
                                height={1080}
                                quality={90}
                                className="screenshot-type-img"
                                onClick={() => setSelectedImage(screenshot.src)}
                            />
                        </div>
                    ))}
                </div>
                <div className="screenshot-disclaimer">
                    Please use fullscreen screenshots <br />
                    I scan these regions for data
                </div>
                {selectedImage && (
                    <div className="image-overlay" onClick={() => setSelectedImage(null)}>
                        <Image 
                            src={selectedImage}
                            alt="Full size screenshot"
                            width={1920}
                            height={1080}
                            quality={90}
                            onClick={e => e.stopPropagation()}
                            className="image-overlay-img"
                        />
                    </div>
                )}
                {isMobile && (
                    <div className="swipe-dots">
                        {SCREENSHOTS.map((_, i) => (
                            <div 
                                key={i} 
                                className={`swipe-dot ${i === currentScreenshot ? 'active' : ''}`}
                            />
                        ))}
                    </div>
                )}
            </section>
            
            <section className="quick-start">
                <h3>Getting Started</h3>
                <div className="steps-container"
                    onTouchStart={handleTouchStart(touchStartRef)}
                    onTouchMove={handleTouchMove(touchStartRef, currentStep, 2, isMobile)}
                    onTouchEnd={handleTouchEnd(touchStartRef, currentStep, 2, setCurrentStep, isMobile)}
                    style={{ 
                        touchAction: 'pan-y pinch-zoom',
                        height: isMobile ? containerHeight : 'auto',
                        transition: 'height 0.3s ease'
                    }}
                >
                    {[0, 1, 2].map((stepIndex) => (
                        <div key={stepIndex} className="step" style={getStepStyles(stepIndex, currentStep, isMobile)}>
                            <div className="step-number">{stepIndex + 1}</div>
                            {stepIndex === 0 && (
                                <>
                                    <p>Take screenshots from the game as shown above</p>
                                    <Image 
                                        src="/images/screenshots.webp"
                                        alt="Screenshot examples"
                                        width={1010}
                                        height={943}
                                        className="step-image"
                                    />
                                    <p className="note">
                                        · &nbsp;Supports most image formats (PNG, JPG, etc.)<br/>
                                        · &nbsp;Performance might vary depending on image quality
                                    </p>
                                </>
                            )}
                            {stepIndex === 1 && (
                                <>
                                    <p>Upload screenshots and let the website scan them automatically</p>
                                    <Image 
                                        src="/images/scan.webp"
                                        alt="Example scan"
                                        width={760}
                                        height={769}
                                        className="step-image"
                                    />
                                    <p className="note">
                                        · &nbsp;Shows simplified results in the UI<br/>
                                        · &nbsp;Check browser console (F12) for full details and errors
                                    </p>
                                </>
                            )}
                            {stepIndex === 2 && (
                                <>
                                    <p>Export and share your completed build</p>
                                    <Image 
                                        src="/images/generate.webp"
                                        alt="Generate build card"
                                        width={1788}
                                        height={2164}
                                        className="step-image"
                                    />
                                    <p className="note">
                                        Note: Currently only supports English language screenshots <br />
                                        You can also skip the screenshots and just manually input everything, or change incorrect data
                                    </p>
                                </>
                            )}
                        </div>
                    ))}
                </div>
                {isMobile && (
                    <div className="swipe-dots">
                        {[0, 1, 2].map((i) => (
                            <div 
                                key={i} 
                                className={`swipe-dot ${i === currentStep ? 'active' : ''}`}
                            />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};