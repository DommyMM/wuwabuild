import Link from 'next/link';

export function HowItWorks() {
    return (
        <section className="py-10 border-t border-border">
            <h2 className="text-xs font-semibold text-text-primary/40 uppercase tracking-widest mb-7">
                How it works
            </h2>
            <div className="grid grid-cols-2 gap-10">
                {/* Flow 1: Leaderboard submission */}
                <div>
                    <div className="font-semibold text-text-primary mb-2">Submitting to the leaderboard</div>
                    <p className="text-sm text-text-primary/50 leading-relaxed mb-3">
                        Use{' '}
                        <a
                            href="https://discord.com/channels/963760374543450182/1323199091072569479"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent/80 hover:text-accent underline underline-offset-2"
                        >
                            wuwa-bot
                        </a>{' '}
                        to get a screenshot, then drop it on the import page. OCR scans it and fills everything in automatically.
                        You can update your display name or UID before submitting — the build data itself is locked to what was scanned.
                        Hit submit and your run is live on the leaderboard.
                    </p>
                    <Link
                        href="/import"
                        className="relative text-sm text-accent/70 hover:text-accent transition-colors duration-150 after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-accent after:transition-[width] after:duration-200 hover:after:w-full"
                    >
                        Import a screenshot →
                    </Link>
                </div>

                {/* Flow 2: Editor */}
                <div>
                    <div className="font-semibold text-text-primary mb-2">Build editor</div>
                    <p className="text-sm text-text-primary/50 leading-relaxed mb-3">
                        Separate from the leaderboard. Create builds from scratch, swap echoes, adjust forte nodes,
                        try different weapon ranks — stats recalculate live. Export a build card image to share anywhere.
                        Good for planning or sharing without submitting to the board.
                    </p>
                    <Link
                        href="/edit"
                        className="relative text-sm text-accent/70 hover:text-accent transition-colors duration-150 after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-accent after:transition-[width] after:duration-200 hover:after:w-full"
                    >
                        Open the editor →
                    </Link>
                </div>
            </div>
        </section>
    );
}
