'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import Image from 'next/image';

const STEPS = [
    {
        number: 1,
        title: 'Use the Official Bot',
        image: '/images/import-full.webp',
        description: 'Use the official wuwa-bot in Discord to generate your build image',
        link: {
            text: 'Get the bot',
            href: 'https://wutheringwaves.kurogames.com/en/main/news/detail/1959',
        },
    },
    {
        number: 2,
        title: 'Upload & Process',
        image: '/images/import-scan.webp',
        description: 'Upload your image on the Import page and let OCR extract your build data',
    },
    {
        number: 3,
        title: 'Import & Edit',
        image: '/images/import-preview.webp',
        description: 'Review the results, make adjustments, and save or export your build',
    },
];

export default function QuickStart() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isMobile, setIsMobile] = useState(false);
    const touchStartRef = useRef<number>(0);

    const checkMobile = useCallback(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth <= 1200;
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

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartRef.current = e.targetTouches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!isMobile) return;
        const touchEnd = e.changedTouches[0].clientX;
        const diff = touchStartRef.current - touchEnd;
        if (Math.abs(diff) > 50) {
            if (diff > 0 && currentStep < STEPS.length - 1) {
                setCurrentStep((prev) => prev + 1);
            } else if (diff < 0 && currentStep > 0) {
                setCurrentStep((prev) => prev - 1);
            }
        }
    };

    return (
        <section className="my-12 max-md:my-8">
            <h3 className="text-4xl font-bold font-gowun text-accent text-center mb-6 max-md:text-2xl max-md:mb-4">
                Quick Start
            </h3>

            <div
                className="relative max-w-5xl mx-auto"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                style={{ touchAction: 'pan-y pinch-zoom' }}
            >
                {/* Desktop: Grid layout */}
                {!isMobile && (
                    <div className="grid grid-cols-3 gap-6">
                        {STEPS.map((step, index) => (
                            <motion.div
                                key={step.number}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.15, duration: 0.4 }}
                                className="group text-center p-6 bg-white/5 rounded-lg transition-transform duration-200 hover:-translate-y-1"
                            >
                                <div className="w-8 h-8 mx-auto mb-3 rounded-full bg-accent flex items-center justify-center font-bold text-background">
                                    {step.number}
                                </div>
                                <h4 className="text-lg font-semibold text-text-primary mb-3">
                                    {step.title}
                                </h4>
                                <div className="relative w-full aspect-video mb-3 rounded-lg overflow-hidden shadow-lg">
                                    <Image
                                        src={step.image}
                                        alt={step.title}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <p className="text-sm text-text-primary/70 leading-relaxed">
                                    {step.description}
                                    {step.link && (
                                        <>
                                            {' '}
                                            <a
                                                href={step.link.href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-accent hover:text-accent-hover underline"
                                            >
                                                {step.link.text}
                                            </a>
                                        </>
                                    )}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Mobile: Swipeable cards */}
                {isMobile && (
                    <>
                        <div className="relative h-[400px] overflow-hidden">
                            {STEPS.map((step, index) => (
                                <motion.div
                                    key={step.number}
                                    className="absolute inset-0 px-4"
                                    initial={false}
                                    animate={{
                                        x: `${(index - currentStep) * 100}%`,
                                        opacity: index === currentStep ? 1 : 0.5,
                                    }}
                                    transition={{ duration: 0.3, ease: 'easeOut' }}
                                >
                                    <div className="text-center p-6 bg-white/5 rounded-lg h-full">
                                        <div className="w-8 h-8 mx-auto mb-3 rounded-full bg-accent flex items-center justify-center font-bold text-background">
                                            {step.number}
                                        </div>
                                        <h4 className="text-lg font-semibold text-text-primary mb-3">
                                            {step.title}
                                        </h4>
                                        <div className="relative w-full aspect-video mb-3 rounded-lg overflow-hidden shadow-lg">
                                            <Image
                                                src={step.image}
                                                alt={step.title}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                        <p className="text-sm text-text-primary/70 leading-relaxed">
                                            {step.description}
                                            {step.link && (
                                                <>
                                                    {' '}
                                                    <a
                                                        href={step.link.href}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-accent hover:text-accent-hover underline"
                                                    >
                                                        {step.link.text}
                                                    </a>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Swipe dots */}
                        <div className="flex justify-center gap-2 mt-4">
                            {STEPS.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentStep(index)}
                                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                        index === currentStep
                                            ? 'bg-accent scale-125 shadow-[0_0_8px_rgba(166,150,98,0.4)]'
                                            : 'bg-accent/30'
                                    }`}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}
