'use client';

import { Typewriter } from './Typewriter';
import { Carousel } from './Carousel';
import { CTACards } from './CTACards';
import { QuickStart } from './QuickStart';
import { Disclaimer } from './Disclaimer';

export function HomePage() {
    return (
        <main className="min-h-screen bg-background">
            <div className="max-w-3/4 mx-auto px-2 md:px-5 py-0 leading-relaxed">
                {/* Hero Section */}
                <section className="py-6">
                    <h3 className="text-4xl font-bold font-gowun text-accent mb-6 max-md:text-2xl max-md:mb-3 text-center">
                        Build Creator
                    </h3>
                    <Typewriter />
                    <Carousel />
                </section>

                {/* CTA Cards */}
                <CTACards />

                {/* Quick Start Guide */}
                <QuickStart />

                {/* Disclaimer */}
                <Disclaimer />
            </div>
        </main>
    );
}
