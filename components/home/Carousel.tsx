'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';

const BUILD_CARDS = [
    { src: "/images/card0.png", alt: "Build Card 1" },
    { src: "/images/card1.png", alt: "Build Card 2" },
    { src: "/images/card2.png", alt: "Build Card 3" },
    { src: "/images/card3.png", alt: "Build Card 4" },
    { src: "/images/card4.png", alt: "Build Card 5" },
];

export default function Carousel() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
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
        if (isHovered) return;
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % BUILD_CARDS.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [isHovered]);

    const goToPrev = () => {
        setCurrentIndex((prev) => (prev - 1 + BUILD_CARDS.length) % BUILD_CARDS.length);
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev + 1) % BUILD_CARDS.length);
    };

    const getCardStyle = (index: number) => {
        const diff = (index - currentIndex + BUILD_CARDS.length) % BUILD_CARDS.length;
        const offset = diff > BUILD_CARDS.length / 2 ? diff - BUILD_CARDS.length : diff;
        const absOffset = Math.abs(offset);
        const direction = Math.sign(offset);

        if (isMobile) {
            return {
                transform: `translateX(${direction * 100}%)`,
                opacity: absOffset === 0 ? 1 : 0,
                pointerEvents: absOffset === 0 ? 'auto' as const : 'none' as const,
                zIndex: absOffset === 0 ? 10 : 0,
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

    return (
        <div
            className="relative w-[85%] mx-auto mb-5 max-md:w-full max-md:mb-0"
            style={{ perspective: '1200px' }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                className="relative h-[400px] max-md:h-[150px]"
                style={{ transformStyle: 'preserve-3d' }}
            >
                {BUILD_CARDS.map((card, index) => (
                    <motion.div
                        key={index}
                        className="absolute w-full h-full"
                        initial={false}
                        animate={getCardStyle(index)}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                    >
                        <Image
                            src={card.src}
                            alt={card.alt}
                            fill
                            className="object-contain rounded-lg"
                            style={{
                                boxShadow: isMobile
                                    ? 'none'
                                    : '20px 0 20px -20px rgba(0, 0, 0, 0.5), -20px 0 20px -20px rgba(0, 0, 0, 0.5)',
                            }}
                            priority={index === 0}
                        />
                    </motion.div>
                ))}
            </div>

            {/* Navigation buttons - hidden on mobile */}
            <button
                onClick={goToPrev}
                className="absolute top-1/2 -translate-y-1/2 -left-8 p-2 text-accent hover:text-accent-hover transition-colors z-20 max-md:hidden"
            >
                <ChevronLeft size={32} />
            </button>
            <button
                onClick={goToNext}
                className="absolute top-1/2 -translate-y-1/2 -right-8 p-2 text-accent hover:text-accent-hover transition-colors z-20 max-md:hidden"
            >
                <ChevronRight size={32} />
            </button>

            {/* Dot indicators for mobile */}
            {isMobile && (
                <div className="flex justify-center gap-2 mt-3">
                    {BUILD_CARDS.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                index === currentIndex
                                    ? 'bg-accent scale-125 shadow-[0_0_8px_rgba(166,150,98,0.4)]'
                                    : 'bg-accent/30'
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
