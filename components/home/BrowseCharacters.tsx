import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { CharacterIndexEntry } from '@/lib/server/ogData';

const ELEMENTS = ['Aero', 'Electro', 'Fusion', 'Glacio', 'Havoc', 'Spectro'] as const;

interface BrowseCharactersProps {
    characters: CharacterIndexEntry[];
}

/**
 * Server-rendered resonator directory. Every card emits two crawlable anchors
 * (dossier + leaderboard), so the previously near-orphaned /characters/[id] and
 * /leaderboards/[id] pages receive internal links and resonator-name keywords.
 *
 * The element filter is pure CSS (radio inputs + `:has()` in globals.css) — no
 * client JS, no hydration cost. The default state renders every card visible, so
 * crawlers always see the full link set.
 */
export function BrowseCharacters({ characters }: BrowseCharactersProps) {
    if (characters.length === 0) return null;

    return (
        <section className="pt-14 md:pt-20">
            <div className="resonator-directory">
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="text-xs tracking-[0.22em] uppercase text-text-primary/50 mb-2.5">
                            Every resonator
                        </div>
                        <h2 className="font-plus-jakarta text-3xl md:text-5xl leading-[1.05] tracking-[-0.02em] font-medium text-balance">
                            Build any Wuthering Waves character.
                        </h2>
                    </div>
                    <p className="font-gowun text-sm text-text-primary/55 tabular-nums">
                        {characters.length} resonators · {ELEMENTS.length} elements
                    </p>
                </div>

                {/* CSS-only element filter — radios hidden; active label + card visibility handled in globals.css via :has() */}
                <div className="mb-5 flex flex-wrap gap-2">
                    <input type="radio" name="resonator-element" id="el-all" defaultChecked className="sr-only" />
                    <label htmlFor="el-all" className="resonator-filter cursor-pointer border border-border px-3 py-1.5 text-xs text-text-primary/60 transition-colors hover:text-text-primary">
                        All
                    </label>
                    {ELEMENTS.map((el) => (
                        <span key={el} className="contents">
                            <input type="radio" name="resonator-element" id={`el-${el}`} className="sr-only" />
                            <label htmlFor={`el-${el}`} className="resonator-filter cursor-pointer border border-border px-3 py-1.5 text-xs text-text-primary/60 transition-colors hover:text-text-primary">
                                {el}
                            </label>
                        </span>
                    ))}
                </div>

                <div className="resonator-grid grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    {characters.map((char) => (
                        <article
                            key={char.id}
                            data-el={char.element}
                            className="resonator-card group flex flex-col overflow-hidden border border-border bg-white/[0.012] transition-colors hover:border-accent/40"
                        >
                            <span
                                aria-hidden
                                className="h-0.5 w-full opacity-50 transition-opacity group-hover:opacity-100"
                                style={{ backgroundColor: char.elementColor ?? '#a69662' } as CSSProperties}
                            />
                            <Link href={`/characters/${char.id}`} className="flex items-center gap-3 p-3">
                                {char.iconRound ? (
                                    <img
                                        src={char.iconRound}
                                        alt=""
                                        width={48}
                                        height={48}
                                        loading="lazy"
                                        decoding="async"
                                        className="h-12 w-12 shrink-0 rounded-full border border-white/10 bg-black/20 object-cover"
                                    />
                                ) : (
                                    <span className="h-12 w-12 shrink-0 rounded-full border border-white/10 bg-black/20" />
                                )}
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-medium text-text-primary group-hover:text-accent">
                                        {char.name}
                                    </span>
                                    <span className="block truncate text-[11px] text-text-primary/45">
                                        {[char.element, char.weaponType].filter(Boolean).join(' · ')}
                                    </span>
                                </span>
                            </Link>
                            <Link
                                href={`/leaderboards/${char.id}`}
                                className="border-t border-border px-3 py-2 text-[11px] tracking-wide text-text-primary/45 transition-colors hover:bg-accent/5 hover:text-accent"
                            >
                                Rankings →
                            </Link>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
