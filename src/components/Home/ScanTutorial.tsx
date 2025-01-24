import React, { useState, useRef, useEffect, CSSProperties } from 'react';

const SCREENSHOTS = [
    { title: 'Character', src: '/images/scan-character.webp' },
    { title: 'Weapon', src: '/images/scan-weapon.webp' },
    { title: 'Forte', src: '/images/scan-forte.webp' },
    { title: 'Resonance Chain', src: '/images/scan-resonance.webp' },
    { title: 'Echoes', src: '/images/scan-echo.webp' },
];

const BREAKPOINT = 1200;

export const handleTouchStart = (touchRef: React.MutableRefObject<number>) => (e: React.TouchEvent) => {
    touchRef.current = e.targetTouches[0].clientX;
};

export const handleTouchMove = (
    touchRef: React.MutableRefObject<number>,
    current: number,
    max: number
) => (e: React.TouchEvent) => {
    if (window.innerWidth > BREAKPOINT) return;
    const touchDiff = touchRef.current - e.targetTouches[0].clientX;
    if ((touchDiff > 0 && current < max) || (touchDiff < 0 && current > 0)) {
        e.stopPropagation();
    }
};

export const handleTouchEnd = (
    touchRef: React.MutableRefObject<number>,
    current: number,
    max: number,
    setCurrent: React.Dispatch<React.SetStateAction<number>>
) => (e: React.TouchEvent) => {
    if (window.innerWidth > BREAKPOINT) return;
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

export const getStepStyles = (index: number, current: number): CSSProperties => {
    if (window.innerWidth <= BREAKPOINT) {
        return {
            transform: `translateX(${100 * (index - current)}%)`,
            transition: 'transform 0.3s ease',
            position: 'absolute',
            left: 0
        };
    }
    return {};
};

export const getScreenshotStyles = (index: number, current: number): CSSProperties => {
    if (window.innerWidth <= BREAKPOINT) {
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
    const touchStartRef = useRef<number>(0);
    const screenshotTouchRef = useRef<number>(0);

    useEffect(() => {
        if (window.innerWidth <= BREAKPOINT) {
            const stepHeights: Record<number, string> = {
                0: '63.1vh',
                1: '71.25vh',
                2: '72.5vh'
            };
            setContainerHeight(stepHeights[currentStep as keyof typeof stepHeights]);
        }
    }, [currentStep]);

    return (
        <div className="scan-tutorial">
            <section className="screenshot-guide">
                <h3>Screenshot Guide</h3>
                <div className="screenshot-grid"
                    onTouchStart={handleTouchStart(screenshotTouchRef)}
                    onTouchMove={handleTouchMove(screenshotTouchRef, currentScreenshot, 4)}
                    onTouchEnd={handleTouchEnd(screenshotTouchRef, currentScreenshot, 4, setCurrentScreenshot)}
                    style={{ 
                        touchAction: 'pan-y pinch-zoom',
                        position: window.innerWidth <= BREAKPOINT ? 'relative' : 'static',
                        height: window.innerWidth <= BREAKPOINT ? '300px' : 'auto',
                        overflow: window.innerWidth <= BREAKPOINT ? 'hidden' : 'visible'
                    }}
                >
                    {SCREENSHOTS.map((screenshot, index) => (
                        <div key={index} className="screenshot-type" style={getScreenshotStyles(index, currentScreenshot)}>
                            <h4>{screenshot.title}</h4>
                            <img src={screenshot.src} alt={`${screenshot.title} Screenshot`} onClick={() => setSelectedImage(screenshot.src)}/>
                        </div>
                    ))}
                </div>
                <div className="screenshot-disclaimer">
                    Please use fullscreen screenshots <br />
                    We scan these regions for data
                </div>
                {selectedImage && (
                    <div className="image-overlay" onClick={() => setSelectedImage(null)}>
                        <img 
                            src={selectedImage} 
                            alt="Full size screenshot" 
                            onClick={e => e.stopPropagation()}
                        />
                    </div>
                )}
                {window.innerWidth <= BREAKPOINT && (
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
                    onTouchMove={handleTouchMove(touchStartRef, currentStep, 2)}
                    onTouchEnd={handleTouchEnd(touchStartRef, currentStep, 2, setCurrentStep)}
                    style={{ 
                        touchAction: 'pan-y pinch-zoom',
                        height: window.innerWidth <= BREAKPOINT ? containerHeight : 'auto',
                        transition: 'height 0.3s ease'
                    }}
                >
                    {[0, 1, 2].map((stepIndex) => (
                        <div key={stepIndex} className="step" style={getStepStyles(stepIndex, currentStep)}>
                            <div className="step-number">{stepIndex + 1}</div>
                            {stepIndex === 0 && (
                                <>
                                    <p>Take screenshots from the game as shown above</p>
                                    <img src="/images/screenshots.webp" alt="Screenshot examples" className="step-image"/>
                                    <p className="note">
                                        · &nbsp;Supports most image formats (PNG, JPG, etc.)<br/>
                                        · &nbsp;Performance might vary depending on image quality
                                    </p>
                                </>
                            )}
                            {stepIndex === 1 && (
                                <>
                                    <p>Upload screenshots and let the website scan them automatically</p>
                                    <img src="/images/scan.webp" alt="Example scan" className="step-image"/>
                                    <p className="note">
                                        · &nbsp;Shows simplified results in the UI<br/>
                                        · &nbsp;Check browser console (F12) for full details and errors
                                    </p>
                                </>
                            )}
                            {stepIndex === 2 && (
                                <>
                                    <p>Export and share your completed build</p>
                                    <img src="/images/generate.webp" alt="Generate build card" className="step-image"/>
                                    <p className="note">
                                        Note: Currently only supports English language screenshots <br />
                                        You can also skip the screenshots and just manually input everything, or change incorrect data
                                    </p>
                                </>
                            )}
                        </div>
                    ))}
                </div>
                {window.innerWidth <= BREAKPOINT && (
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