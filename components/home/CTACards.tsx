'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Upload, PenTool } from 'lucide-react';

const cards = [
    {
        href: '/import',
        icon: Upload,
        title: 'Import from Bot',
        description: 'Upload a wuwa-bot image and automatically extract your build data',
    },
    {
        href: '/edit',
        icon: PenTool,
        title: 'Create Manually',
        description: 'Build from scratch or scan screenshots directly in the editor',
    },
];

export default function CTACards() {
    return (
        <div className="flex justify-center gap-6 my-8 max-md:flex-col max-md:items-center max-md:gap-4 max-md:my-6 max-md:px-4">
            {cards.map((card, index) => (
                <motion.div
                    key={card.href}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.4 }}
                >
                    <Link
                        href={card.href}
                        className="group flex flex-col items-center p-6 w-72 bg-background-secondary border border-border rounded-lg transition-all duration-300 hover:border-accent hover:shadow-[0_0_20px_rgba(166,150,98,0.15)] max-md:w-full max-md:max-w-sm"
                    >
                        <div className="p-3 mb-4 rounded-full bg-accent/10 text-accent group-hover:bg-accent/20 transition-colors">
                            <card.icon size={28} strokeWidth={1.5} />
                        </div>
                        <h3 className="text-xl font-gowun font-semibold text-text-primary mb-2 group-hover:text-accent transition-colors">
                            {card.title}
                        </h3>
                        <p className="text-sm text-text-primary/60 text-center leading-relaxed">
                            {card.description}
                        </p>
                    </Link>
                </motion.div>
            ))}
        </div>
    );
}
