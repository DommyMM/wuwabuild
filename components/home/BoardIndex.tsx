import { LB_SEQ_BADGE_COLORS } from '../leaderboards/constants';
import { HomeLink } from './HomeLink';
import type { HomeBoardRecord } from './types';

interface BoardIndexProps {
    records: HomeBoardRecord[];
}

// 9 rows at 60px lines this column up with the NewsLog window (max-h-[544px]) next door.
const VISIBLE_BOARDS = 9;

/**
 * The most contested boards at a glance, one per character so the list shows
 * breadth instead of sequence variants. Per character: most entries, then the
 * base sequence, then the bigger record.
 */
export function BoardIndex({ records }: BoardIndexProps) {
    const sorted = [...records].sort((a, b) =>
        b.totalEntries - a.totalEntries || a.seqLevel - b.seqLevel || b.topDamage - a.topDamage,
    );
    const byCharacter = new Map<string, HomeBoardRecord>();
    for (const record of sorted) {
        if (!byCharacter.has(record.characterId)) byCharacter.set(record.characterId, record);
    }
    const boards = [...byCharacter.values()].slice(0, VISIBLE_BOARDS);

    return (
        <section>
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 mb-5">
                <h2 className="font-plus-jakarta text-xl md:text-2xl font-medium tracking-[-0.01em]">
                    Top leaderboards
                </h2>
                <HomeLink
                    href="/leaderboards"
                    cta="leaderboards"
                    section="boards_index"
                    className="text-sm text-accent hover:text-accent-hover transition-colors"
                >
                    All {records.length} boards →
                </HomeLink>
            </div>

            {boards.length > 0 ? (
                <ol className="border-t border-border">
                    {boards.map((board) => (
                        <li key={`${board.characterId}:${board.trackKey}`} className="border-b border-border/60">
                            <HomeLink
                                href={board.href}
                                cta="leaderboards"
                                section="boards_index"
                                characterId={board.characterId}
                                className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 py-2.5 hover:bg-accent/6 transition-colors"
                            >
                                {board.head ? (
                                    <img
                                        src={board.head}
                                        alt=""
                                        className="h-10 w-10 object-cover object-top"
                                        loading="lazy"
                                    />
                                ) : (
                                    <span className="h-10 w-10 bg-border/30" aria-hidden />
                                )}
                                <span className="min-w-0">
                                    <span className="flex items-center gap-2 min-w-0">
                                        <span className={`truncate text-[15px] leading-tight font-semibold ${board.element ? `char-sig char-sig-static ${board.element}` : 'text-text-primary'}`}>
                                            {board.name}
                                        </span>
                                        {board.seqLevel > 0 && (
                                            <span className={`shrink-0 rounded border px-1 py-0.5 text-[10px] font-semibold leading-none tracking-wide ${LB_SEQ_BADGE_COLORS[board.seqLevel]}`}>
                                                S{board.seqLevel}
                                            </span>
                                        )}
                                    </span>
                                    <span className="block truncate text-xs text-text-primary/45 leading-tight">
                                        {board.trackLabel || 'Standard rotation'}
                                    </span>
                                </span>
                                <span className="text-right">
                                    <span className="block font-gowun text-[15px] leading-tight text-accent tabular-nums">
                                        {board.topDamage > 0 ? Math.round(board.topDamage).toLocaleString('en-US') : '-'}
                                    </span>
                                    {/* Entry count only: it is what the list is ordered by, and it
                                        stays legible so the ordering is explicable. The owner used
                                        to sit here joined by a "·", which read as a second metric
                                        when it actually qualifies the damage above it. It is already
                                        on the hero record card and on the board itself. */}
                                    <span className="block font-mono text-[11px] leading-tight text-text-primary/55 tabular-nums">
                                        {board.totalEntries.toLocaleString('en-US')} {board.totalEntries === 1 ? 'entry' : 'entries'}
                                    </span>
                                </span>
                            </HomeLink>
                        </li>
                    ))}
                </ol>
            ) : (
                <p className="border-t border-border pt-4 text-sm text-text-primary/50">
                    No boards loaded. Either the leaderboard service is down or something broke, try again in a minute.
                </p>
            )}

            <p className="mt-4 text-sm text-text-primary/50">
                Want a board that isn&apos;t here? Ask in the{' '}
                <a
                    href="https://discord.gg/puZSXRKTPC"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-hover underline underline-offset-2"
                >
                    Discord
                </a>{' '}
            </p>
        </section>
    );
}
