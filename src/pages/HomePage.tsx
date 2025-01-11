import React, { useEffect, useState, CSSProperties } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import '../styles/Home.css';

const FEATURES = [
    "Create and customize character builds",
    "Export builds as shareable images",
    "Load and modify existing builds",
    "Compare builds with other players"
];

const BUILD_CARDS = [
    { src: "/images/card.png", alt: "Build Card 1" },
    { src: "/images/card1.png", alt: "Build Card 2" },
    { src: "/images/card2.png", alt: "Build Card 3" },
    { src: "/images/card3.png", alt: "Build Card 4" },
    { src: "/images/card4.png", alt: "Build Card 5" },
];

export const HomePage: React.FC = () => {
    const [text, setText] = useState('');
    const [featureIndex, setFeatureIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

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

    const getCardStyles = (index: number): CSSProperties => {
        const diff = (index - currentCardIndex + BUILD_CARDS.length) % BUILD_CARDS.length;
        const offset = diff > BUILD_CARDS.length / 2 ? diff - BUILD_CARDS.length : diff;
        const absOffset = Math.abs(offset);
        const direction = Math.sign(offset);
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
                                    <div
                                        key={index}
                                        className="carousel-item"
                                        style={getCardStyles(index)}
                                    >
                                        <img 
                                            src={card.src}
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
                <section className="scanning">
                    <div className="scanning-text">
                        <div className="scan-line">
                            <span className="dot">·</span>
                            <span>No need to manually input your build.</span>
                        </div>
                        <div className="scan-line">
                            <span className="dot">·</span>
                            <span>Just upload screenshots, and we'll do the rest.</span>
                        </div>
                    </div>
                    <div className="scan-section">
                        <img 
                            src="/images/scan.png" 
                            alt="Example scan" 
                            className="scan-example"
                        />
                        <p className="scanning-note">
                            Note: For best results, use full screen screenshots.
                            <br />
                            Currently only supports English language screenshots.
                        </p>
                    </div>
                </section>
                <section className="disclaimer">
                    <p>Disclaimer: This is a fan-made tool and is not affiliated with Wuthering Waves.</p>
                    <p>All game content and materials are trademarks and copyrights of their respective owners.</p>
                </section>
            </div>
        </main>
    );
};