import Link from 'next/link';

export function Footer() {
    return (
        <footer className="border-t border-border py-4">
            <div className="flex items-center justify-between gap-2 sm:gap-0 mb-2">
                <span className="font-gowun text-accent text-sm">WuWa Builds</span>
                <div className="flex items-center gap-4">
                    <Link
                        href="/privacy"
                        className="text-xs text-text-primary/40 hover:text-accent transition-colors"
                    >
                        Privacy Policy
                    </Link>
                    <Link
                        href="/tos"
                        className="text-xs text-text-primary/40 hover:text-accent transition-colors"
                    >
                        Terms of Service
                    </Link>
                </div>
            </div>
            <p className="text-xs text-text-primary/35">
                Independent fan tool, unaffiliated with Wuthering Waves or Kuro Games.
            </p>
        </footer>
    );
}
