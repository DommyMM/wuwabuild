'use client';

import Typewriter from './Typewriter';
import Carousel from './Carousel';
import CTACards from './CTACards';
import QuickStart from './QuickStart';
import Disclaimer from './Disclaimer';

export default function HomePage() {
    return (
        <main className="min-h-screen bg-background">
            <div className="mx-auto px-5 py-0 text-center leading-relaxed">
                {/* Hero Section */}
                <section className="pt-3">
                    <h3 className="text-4xl font-bold font-gowun text-accent mb-6 max-md:text-2xl max-md:mb-3">
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
