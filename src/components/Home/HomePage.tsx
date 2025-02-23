'use client';
import { useState, useEffect, useCallback, useLayoutEffect, CSSProperties } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ScanTutorial } from './ScanTutorial';
import { ImportTutorial } from './ImportTutorial';
import '@/styles/Home.css';

const FEATURES = [
    "Create and customize character builds",
    "Export builds as shareable images",
    "Load and modify existing builds",
    "Compare builds with other players"
];

const BUILD_CARDS = [
    { src: "/images/card0.png", alt: "Build Card 1" },
    { src: "/images/card1.png", alt: "Build Card 2" },
    { src: "/images/card2.png", alt: "Build Card 3" },
    { src: "/images/card3.png", alt: "Build Card 4" },
    { src: "/images/card4.png", alt: "Build Card 5" },
];

type TutorialType = "SCAN" | "IMPORT";

export default function HomePage() {
    const [text, setText] = useState('');
    const [featureIndex, setFeatureIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [tutorialType, setTutorialType] = useState<TutorialType>("IMPORT");
    const [isMobile, setIsMobile] = useState(false);

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

    // Memoize the check mobile function
    const checkMobile = useCallback(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth <= 768;
    }, []);

    // Run once on mount to set initial mobile state
    useLayoutEffect(() => {
        setIsMobile(checkMobile());
        
        const handleResize = () => {
            // Only update if the breakpoint actually changes
            const newIsMobile = checkMobile();
            if (newIsMobile !== isMobile) {
                setIsMobile(newIsMobile);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [checkMobile, isMobile]);

    const getCardStyles = useCallback((index: number): CSSProperties => {
        const diff = (index - currentCardIndex + BUILD_CARDS.length) % BUILD_CARDS.length;
        const offset = diff > BUILD_CARDS.length / 2 ? diff - BUILD_CARDS.length : diff;
        const absOffset = Math.abs(offset);
        const direction = Math.sign(offset);
    
        if (isMobile) {
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
    }, [currentCardIndex, isMobile]);

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
                                        <img src={card.src} alt={card.alt} className="carousel-image"/>
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
                <div className="tutorial-toggle">
                    <button className={`toggle-btn ${tutorialType === "IMPORT" ? "active" : ""}`}
                        onClick={() => setTutorialType("IMPORT")}>
                        Import Build
                    </button>
                    <button className={`toggle-btn ${tutorialType === "SCAN" ? "active" : ""}`}
                        onClick={() => setTutorialType("SCAN")}>
                        Scan Build
                    </button>
                </div>
                {tutorialType === "SCAN" ? <ScanTutorial /> : <ImportTutorial />}
                <section className="disclaimer">
                    <p>Disclaimer: This is an independent tool and is unaffiliated with Wuthering Waves or Kuro Games.</p>
                    <p>All game content and materials are trademarks and copyrights of their respective owners.</p>
                </section>
            </div>
        </main>
    );
}