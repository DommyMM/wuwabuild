import Link from 'next/link';

interface LiveStatsProps {
    totalBuilds: number;
    totalLeaderboards: number;
}

export function LiveStats({ totalBuilds, totalLeaderboards }: LiveStatsProps) {
    if (totalBuilds === 0 && totalLeaderboards === 0) return null;

    return (
        <section className="py-10 border-t border-border">
            <div className="flex items-center gap-14">
                {totalBuilds > 0 && (
                    <div>
                        <div className="text-3xl font-bold font-gowun text-accent">
                            {totalBuilds.toLocaleString()}
                        </div>
                        <div className="text-xs text-text-primary/45 mt-1 uppercase tracking-widest">
                            builds submitted
                        </div>
                    </div>
                )}
                {totalLeaderboards > 0 && (
                    <div>
                        <div className="text-3xl font-bold font-gowun text-accent">
                            {totalLeaderboards.toLocaleString()}
                        </div>
                        <div className="text-xs text-text-primary/45 mt-1 uppercase tracking-widest">
                            active leaderboards
                        </div>
                    </div>
                )}
                <div className="ml-auto">
                    <Link
                        href="/leaderboards"
                        className="text-sm text-text-primary/45 hover:text-accent transition-colors duration-150"
                    >
                        View all leaderboards →
                    </Link>
                </div>
            </div>
        </section>
    );
}
