import React, { useEffect, useState, CSSProperties, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import '../styles/Home.css';

const FEATURES = [
    "Create and customize character builds",
    "Export builds as shareable images",
    "Load and modify existing builds",
    "Compare builds with other players"
];

const BUILD_CARDS = [
    { src: "/images/card.webp", alt: "Build Card 1" },
    { src: "/images/card1.webp", alt: "Build Card 2" },
    { src: "/images/card2.webp", alt: "Build Card 3" },
    { src: "/images/card3.webp", alt: "Build Card 4" },
    { src: "/images/card4.webp", alt: "Build Card 5" },
];

const SCREENSHOTS = [
    { title: 'Character', src: '/images/scan-character.webp' },
    { title: 'Weapon', src: '/images/scan-weapon.webp' },
    { title: 'Forte', src: '/images/scan-forte.webp' },
    { title: 'Resonance Chain', src: '/images/scan-resonance.webp' },
    { title: 'Echoes', src: '/images/scan-echo.webp' },
];

export const HomePage: React.FC = () => {
    const [text, setText] = useState('');
    const [featureIndex, setFeatureIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [currentScreenshot, setCurrentScreenshot] = useState(0);
    const touchStartRef = useRef<number>(0);
    const screenshotTouchRef = useRef<number>(0);
    const [containerHeight, setContainerHeight] = useState('64vh');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    
    useEffect(() => {
        const currentFeature = FEATURES[featureIndex];
        const typingSpeed = 50;
        const deletingSpeed = 30;
        const pauseDuration = 2000;
        
        const timeout = setTimeout(() => {
            if (!isDeleting) {
                setText(currentFeature.slice(0, text.length + 1));
                if (text === currentFeature) {
                    setTimeout(() => setIsDeleting(true), pauseDuration);
                }
            } else {
                setText(text.slice(0, -1));
                if (text === '') {
                    setIsDeleting(false);
                    setFeatureIndex((featureIndex + 1) % FEATURES.length);
                }
            }
        }, isDeleting ? deletingSpeed : typingSpeed);
        return () => clearTimeout(timeout);
    }, [text, featureIndex, isDeleting]);

    useEffect(() => {
        if (isHovered) return;
        
        const timer = setInterval(() => {
            setCurrentCardIndex((prev) => (prev + 1) % BUILD_CARDS.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [isHovered]);

    useEffect(() => {
        if (window.innerWidth <= 1200) {
            const stepHeights: Record<number, string> = {
                0: '63.1vh',
                1: '71.25vh',
                2: '72.5vh'
            };
            setContainerHeight(stepHeights[currentStep as keyof typeof stepHeights]);
        }
    }, [currentStep]);

    const getCardStyles = (index: number): CSSProperties => {
        const diff = (index - currentCardIndex + BUILD_CARDS.length) % BUILD_CARDS.length;
        const offset = diff > BUILD_CARDS.length / 2 ? diff - BUILD_CARDS.length : diff;
        const absOffset = Math.abs(offset);
        const direction = Math.sign(offset);
    
        if (window.innerWidth <= 768) {
            return {
                transform: `translateX(${direction * 100}%)`,
                opacity: absOffset === 0 ? 1 : 0,
                position: 'absolute',
                transition: 'all 0.3s ease',
                pointerEvents: absOffset === 0 ? 'auto' : 'none'
            };
        }
        return {
            transform: `
                rotateY(${offset * -35}deg)
                scaleY(${1 + absOffset * -0.4})
                translateZ(${absOffset * -20}rem)
                translateX(${direction * 3}rem)
            `,
            filter: `blur(${absOffset * 1}rem)`,
            opacity: absOffset <= 1 ? 1 : 0,
            zIndex: 10 - absOffset,
            pointerEvents: absOffset === 0 ? 'auto' : 'none'
        };
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartRef.current = e.targetTouches[0].clientX;
    };
    const handleTouchMove = (e: React.TouchEvent) => {
        if (window.innerWidth > 1200) return;
        const touchDiff = touchStartRef.current - e.targetTouches[0].clientX;
        if ((touchDiff > 0 && currentStep < 2) || (touchDiff < 0 && currentStep > 0)) {
            e.stopPropagation();
        }
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (window.innerWidth > 1200) return;
        const touchEnd = e.changedTouches[0].clientX;
        const touchDiff = touchStartRef.current - touchEnd;
        if (Math.abs(touchDiff) > 50) {
            if (touchDiff > 0 && currentStep < 2) {
                setCurrentStep(prev => prev + 1);
            } else if (touchDiff < 0 && currentStep > 0) {
                setCurrentStep(prev => prev - 1);
            }
        }
    };

    const getStepStyles = (index: number): CSSProperties => {
        if (window.innerWidth <= 1200) {
            return {
                transform: `translateX(${100 * (index - currentStep)}%)`,
                transition: 'transform 0.3s ease',
                position: 'absolute',
                left: 0
            };
        }
        return {};
    };

    const handleScreenshotTouch = {
        start: (e: React.TouchEvent) => {
            screenshotTouchRef.current = e.targetTouches[0].clientX;
        },
        move: (e: React.TouchEvent) => {
            if (window.innerWidth > 1200) return;
            const touchDiff = screenshotTouchRef.current - e.targetTouches[0].clientX;
            if ((touchDiff > 0 && currentScreenshot < 4) || (touchDiff < 0 && currentScreenshot > 0)) {
                e.stopPropagation();
            }
        },
        end: (e: React.TouchEvent) => {
            if (window.innerWidth > 1200) return;
            const touchEnd = e.changedTouches[0].clientX;
            const touchDiff = screenshotTouchRef.current - touchEnd;
            if (Math.abs(touchDiff) > 50) {
                if (touchDiff > 0 && currentScreenshot < 4) {
                    setCurrentScreenshot(prev => prev + 1);
                } else if (touchDiff < 0 && currentScreenshot > 0) {
                    setCurrentScreenshot(prev => prev - 1);
                }
            }
        }
    };
    
    const getScreenshotStyles = (index: number): CSSProperties => {
        if (window.innerWidth <= 1200) {
            return {
                transform: `translateX(${100 * (index - currentScreenshot)}%)`,
                transition: 'transform 0.3s ease',
                position: 'absolute',
                left: 0,
                width: '100%'
            };
        }
        return {};
    };

    const handleImageClick = (src: string) => {
        setSelectedImage(src);
    };

    const closeOverlay = () => {
        setSelectedImage(null);
    };
    
    return (
        <main className="home-page">
            <div className="main-content">
                <section className="overview">
                    <h3>Build Creator</h3>
                    <div className="overview-content">
                        <div className="overview-text">
                            <div className="typewriter-container">
                                <span className="dot">·</span>
                                <span className="typewriter-text">{text}</span>
                                <span className="cursor">|</span>
                            </div>
                        </div>
                        <div className="carousel"
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                        >
                            <div className="carousel-container">
                                {BUILD_CARDS.map((card, index) => (
                                    <div key={index}
                                        className="carousel-item"
                                        style={getCardStyles(index)}
                                    >
                                        <img src={card.src}
                                            alt={card.alt}
                                            className="carousel-image"
                                        />
                                    </div>
                                ))}
                            </div>
                            <button 
                                onClick={() => setCurrentCardIndex(prev => 
                                    (prev - 1 + BUILD_CARDS.length) % BUILD_CARDS.length
                                )}
                                className="carousel-button carousel-button-left"
                            >
                                <ChevronLeft size={32} />
                            </button>
                            <button 
                                onClick={() => setCurrentCardIndex(prev => 
                                    (prev + 1) % BUILD_CARDS.length
                                )}
                                className="carousel-button carousel-button-right"
                            >
                                <ChevronRight size={32} />
                            </button>
                        </div>
                    </div>
                </section>
                <section className="screenshot-guide">
                    <h3>Screenshot Guide</h3>
                    <div className="screenshot-grid"
                        onTouchStart={handleScreenshotTouch.start}
                        onTouchMove={handleScreenshotTouch.move}
                        onTouchEnd={handleScreenshotTouch.end}
                        style={{ 
                            touchAction: 'pan-y pinch-zoom',
                            position: window.innerWidth <= 1200 ? 'relative' : 'static',
                            height: window.innerWidth <= 1200 ? '300px' : 'auto',
                            overflow: window.innerWidth <= 1200 ? 'hidden' : 'visible'
                        }}
                    >
                        {SCREENSHOTS.map((screenshot, index) => (
                            <div key={index} className="screenshot-type" style={getScreenshotStyles(index)}>
                                <h4>{screenshot.title}</h4>
                                <img src={screenshot.src} alt={`${screenshot.title} Screenshot`} onClick={() => handleImageClick(screenshot.src)}/>
                            </div>
                        ))}
                    </div>
                    <div className="screenshot-disclaimer">
                            Please use fullscreen screenshots <br />
                            We scan these regions for data
                    </div>
                    {selectedImage && (
                        <div className="image-overlay" onClick={closeOverlay}>
                            <img 
                                src={selectedImage} 
                                alt="Full size screenshot" 
                                onClick={e => e.stopPropagation()}
                            />
                        </div>
                    )}
                    {window.innerWidth <= 1200 && (
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
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        style={{ 
                            touchAction: 'pan-y pinch-zoom',
                            height: window.innerWidth <= 1200 ? containerHeight : 'auto',
                            transition: 'height 0.3s ease'
                        }}
                    >
                        {[0, 1, 2].map((stepIndex) => (
                            <div key={stepIndex} className="step" style={getStepStyles(stepIndex)}>
                                <div className="step-number">{stepIndex + 1}</div>
                                {stepIndex === 0 && (
                                    <>
                                        <p>Take screenshots from the game as shown above</p>
                                        <img src="/images/screenshots.webp" 
                                            alt="Screenshot examples" 
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
                                        <img src="/images/scan.webp" 
                                            alt="Example scan" 
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
                                        <img src="/images/generate.webp" 
                                            alt="Generate build card" 
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
                    {window.innerWidth <= 1200 && (
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
                <section className="disclaimer">
                    <p>Disclaimer: This is an independent tool and is not affiliated with Wuthering Waves or Kuro Games.</p>
                    <p>All game content and materials are trademarks and copyrights of their respective owners.</p>
                </section>
            </div>
        </main>
    );
};