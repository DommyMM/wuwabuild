'use client';

import { useState, useEffect, useCallback } from 'react';
import { Pause, Play } from 'lucide-react';
import { motion } from 'motion/react';

const BUILD_CARDS = [
    { src: "/images/card0.png", alt: "Build Card 1" },
    { src: "/images/card1.png", alt: "Build Card 2" },
    { src: "/images/card2.png", alt: "Build Card 3" },
    { src: "/images/card3.png", alt: "Build Card 4" },
    { src: "/images/card4.png", alt: "Build Card 5" },
];

export default function Carousel() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const checkMobile = useCallback(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth <= 768;
    }, []);

    useEffect(() => {
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
        if (isPaused) return;
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % BUILD_CARDS.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [isPaused]);

    const getCardStyle = (index: number) => {
        const diff = (index - currentIndex + BUILD_CARDS.length) % BUILD_CARDS.length;
        const offset = diff > BUILD_CARDS.length / 2 ? diff - BUILD_CARDS.length : diff;
        const absOffset = Math.abs(offset);
        const direction = Math.sign(offset);

        if (isMobile) {
            return {
                opacity: absOffset === 0 ? 1 : 0,
                pointerEvents: absOffset === 0 ? 'auto' as const : 'none' as const,
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
            pointerEvents: absOffset === 0 ? 'auto' as const : 'none' as const,
        };
    };

    const isActive = (index: number) => index === currentIndex;

    return (
        <div
            className="relative flex justify-center"
            style={{ perspective: '1200px' }}
        >
            <div
                className="relative w-fit"
                style={{ transformStyle: 'preserve-3d' }}
            >
                {BUILD_CARDS.map((card, index) => (
                    <motion.div
                        key={index}
                        className={index === 0 ? "relative" : "absolute inset-0"}
                        initial={false}
                        animate={getCardStyle(index)}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                    >
                        <div className="relative">
                            <img
                                src={card.src}
                                alt={card.alt}
                                className="h-96 max-md:h-32 w-auto rounded-lg"
                            />
                            {isActive(index) && (
                                <button
                                    onClick={() => setIsPaused(!isPaused)}
                                    className="absolute top-3 right-3 z-30 p-1.5 bg-black/30 hover:bg-black/50 rounded-full text-white/70 hover:text-white transition-all duration-200 cursor-pointer backdrop-blur-sm"
                                    title={isPaused ? 'Play' : 'Pause'}
                                >
                                    {isPaused ? <Play size={16} /> : <Pause size={16} />}
                                </button>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
