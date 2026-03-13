'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';

const FEATURES = [
    "Create and customize character builds",
    "Export builds as shareable images",
    "Load and modify existing builds",
    "Compare builds with other players"
];

export function Typewriter() {
    const [text, setText] = useState('');
    const [featureIndex, setFeatureIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

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

    return (
        <div className="flex items-center justify-start mb-6">
            <span className="text-accent text-4xl mr-2 max-md:text-2xl">·</span>
            <span className="font-gowun text-text-primary text-4xl whitespace-nowrap max-md:text-xl">
                {text}
            </span>
            <motion.span
                className="ml-0.5 font-bold text-accent text-4xl max-md:text-2xl"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
            >
                |
            </motion.span>
        </div>
    );
}
