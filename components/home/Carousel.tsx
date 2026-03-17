'use client';

import { useState, useEffect } from 'react';
import { Pause, Play } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

const BUILD_CARDS = [
    { src: "/images/card0.webp", alt: "Build Card 1" },
    { src: "/images/card1.webp", alt: "Build Card 2" },
    { src: "/images/card2.webp", alt: "Build Card 3" },
    { src: "/images/card3.webp", alt: "Build Card 4" },
    { src: "/images/card4.webp", alt: "Build Card 5" },
];

const isMobileViewport = () => typeof window === 'undefined' ? false : window.innerWidth < 640;

export function Carousel() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isMobile, setIsMobile] = useState(isMobileViewport);

    useEffect(() => {
        const onResize = () => setIsMobile(isMobileViewport());
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        if (isPaused) return;
        const timer = setInterval(() => setCurrentIndex(i => (i + 1) % BUILD_CARDS.length), 4000);
        return () => clearInterval(timer);
    }, [isPaused]);

    const dots = (
        <div className="flex justify-center gap-1.5 mt-3">
            {BUILD_CARDS.map((_, i) => (
                <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`h-1 rounded-full transition-all duration-300 ${
                        i === currentIndex ? 'w-4 bg-accent' : 'w-1.5 bg-text-primary/20 hover:bg-text-primary/40'
                    }`}
                    aria-label={`Go to card ${i + 1}`}
                />
            ))}
        </div>
    );

    // Mobile: simple crossfade, no 3D, no layout tricks
    if (isMobile) {
        return (
            <div className="w-full">
                <div className="relative rounded-lg overflow-hidden">
                    <img src={BUILD_CARDS[0].src} alt="" aria-hidden className="w-full h-auto invisible" />
                    <AnimatePresence mode="sync">
                        <motion.img
                            key={currentIndex}
                            src={BUILD_CARDS[currentIndex].src}
                            alt={BUILD_CARDS[currentIndex].alt}
                            className="absolute inset-0 w-full h-full object-cover"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.4, ease: 'easeInOut' }}
                        />
                    </AnimatePresence>
                    <button
                        onClick={() => setIsPaused(p => !p)}
                        className="absolute top-3 right-3 z-30 p-1.5 bg-black/30 hover:bg-black/50 rounded-full text-white/70 hover:text-white transition-all duration-200 cursor-pointer backdrop-blur-sm"
                        title={isPaused ? 'Play' : 'Pause'}
                    >
                        {isPaused ? <Play size={16} /> : <Pause size={16} />}
                    </button>
                </div>
                {dots}
            </div>
        );
    }

    // Desktop: original 3D carousel
    const getCardStyle = (index: number) => {
        const n = BUILD_CARDS.length;
        const diff = (index - currentIndex + n) % n;
        const offset = diff > n / 2 ? diff - n : diff;
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
            pointerEvents: absOffset === 0 ? 'auto' as const : 'none' as const,
        };
    };

    return (
        <div className="w-fit mx-auto">
            <div className="relative flex justify-center" style={{ perspective: '1200px' }}>
                <div className="relative w-fit" style={{ transformStyle: 'preserve-3d' }}>
                    {BUILD_CARDS.map((card, index) => (
                        <motion.div
                            key={index}
                            className={index === 0 ? 'relative' : 'absolute inset-0'}
                            initial={false}
                            animate={getCardStyle(index)}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                        >
                            <div className="relative">
                                <img
                                    src={card.src}
                                    alt={card.alt}
                                    className="h-96 w-auto rounded-lg"
                                />
                                {index === currentIndex && (
                                    <button
                                        onClick={() => setIsPaused(p => !p)}
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
            {dots}
        </div>
    );
}
