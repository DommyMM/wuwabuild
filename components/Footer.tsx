import Link from 'next/link';

const primaryLinks = [
    { href: '/import', label: 'Import' },
    { href: '/builds', label: 'Builds' },
    { href: '/leaderboards', label: 'Leaderboards' },
    { href: '/edit', label: 'Build Editor' },
    { href: '/saves', label: 'Saves' },
];

const supportLinks = [
    { href: '/changelog', label: 'Changelog' },
    { href: 'https://discord.gg/puZSXRKTPC', label: 'Discord' },
    { href: '/privacy', label: 'Privacy' },
    { href: '/tos', label: 'Terms' },
    { href: 'mailto:help@wuwa.build', label: 'Contact' },
];

export function Footer() {
    return (
        <footer className="mt-14 border-t border-border bg-background-secondary/60">
            <div className="mx-auto grid max-w-360 gap-8 px-6 py-8 md:grid-cols-[1.2fr_1fr_1fr] md:px-16">
                <div>
                    <Link
                        href="/"
                        className="font-gowun text-2xl font-bold text-accent no-underline transition-colors hover:text-accent-hover"
                    >
                        WuWaBuilds
                    </Link>
                    <p className="mt-2 max-w-96 text-sm leading-relaxed text-text-primary/55">
                        Build cards, imports, and damage leaderboards for Wuthering Waves.
                        Independent fan tool made by one person, unaffiliated with Kuro Games.
                        Records refresh every five minutes. Bugs, requests, and complaints go to the{' '}
                        <a
                            href="https://discord.gg/puZSXRKTPC"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:text-accent-hover transition-colors"
                        >
                            Discord
                        </a>
                        .
                    </p>
                </div>

                <nav aria-label="Footer navigation">
                    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-primary/60">
                        Tools
                    </h2>
                    <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-sm md:grid-cols-1">
                        {primaryLinks.map(({ href, label }) => (
                            <Link
                                key={href}
                                href={href}
                                className="text-text-primary/65 no-underline transition-colors hover:text-accent"
                            >
                                {label}
                            </Link>
                        ))}
                    </div>
                </nav>

                <div>
                    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-primary/60">
                        Site
                    </h2>
                    <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-sm md:grid-cols-1">
                        {supportLinks.map(({ href, label }) => {
                            const isExternal = href.startsWith('http') || href.startsWith('mailto');
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    target={isExternal ? '_blank' : undefined}
                                    rel={isExternal ? 'noopener noreferrer' : undefined}
                                    className="text-text-primary/65 no-underline transition-colors hover:text-accent"
                                >
                                    {label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="border-t border-border/70">
                <div className="mx-auto flex max-w-360 flex-col gap-2 px-6 py-4 text-xs text-text-primary/60 md:flex-row md:items-center md:justify-between md:px-16">
                    <span>© {new Date().getFullYear()} WuWa Builds</span>
                    <span>Game assets, names, and trademarks belong to their respective owners.</span>
                </div>
            </div>
        </footer>
    );
}
