'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Upload, Pencil } from 'lucide-react';

const cards = [
    {
        href: '/import',
        icon: Upload,
        title: 'Import from Bot',
        description: 'Upload a wuwa-bot image and automatically extract your build data',
        primary: true,
    },
    {
        href: '/edit',
        icon: Pencil,
        title: 'Create Manually',
        description: 'Build from scratch or scan screenshots directly in the editor',
        primary: false,
    },
];

export function CTACards() {
    return (
        <div className="flex justify-center gap-4 my-8 max-md:flex-col max-md:items-center max-md:gap-3 max-md:my-6 max-md:px-4">
            {cards.map((card, index) => (
                <motion.div
                    key={card.href}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.4 }}
                >
                    <Link
                        href={card.href}
                        className={`group flex items-center gap-3 px-6 py-4 rounded-md transition-all duration-200 hover:-translate-y-1 max-md:w-full max-md:max-w-sm ${
                            card.primary
                                ? 'bg-accent text-background font-semibold hover:bg-accent-hover'
                                : 'bg-background-secondary border border-border text-text-primary hover:border-accent hover:text-accent'
                        }`}
                    >
                        <card.icon size={20} strokeWidth={2} />
                        <span className="text-base">{card.title}</span>
                    </Link>
                </motion.div>
            ))}
        </div>
    );
}
