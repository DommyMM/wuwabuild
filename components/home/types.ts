/** Server-resolved leaderboard record for the home page board index. */
export interface HomeBoardRecord {
    characterId: string;
    trackKey: string;
    /** Prebuilt href into the per-character leaderboard (same helper as the overview page). */
    href: string;
    name: string;
    /** Lowercase element key for `char-sig` styling; empty when unknown. */
    element: string;
    head: string | null;
    seqLevel: number;
    /** Track label with the "S{n}" prefix stripped (sequence shown separately). */
    trackLabel: string;
    totalEntries: number;
    /** Best damage across the board's weapons; 0 = no record yet. */
    topDamage: number;
    topOwner: string;
    /** Weapon holding the board record, used to resolve weapon display and the matching #1 row. */
    topWeaponId: string;
    /** RFC3339 start of the selected weapon's current rank-1 hold; empty when unknown. */
    topReignSince: string;
    isHeal: boolean;
}

/** One hero showcase slide: a character's record run over their splash art. */
export interface HomeHeroSlide {
    characterId: string;
    trackKey: string;
    href: string;
    name: string;
    element: string;
    seqLevel: number;
    trackLabel: string;
    splashUrl: string;
    weaponName: string;
    weaponIcon: string | null;
    damage: number;
    owner: string;
    /** Pre-formatted reign text ("#1 for 12 days"), computed server-side; null when unknown. */
    reignLabel: string | null;
}
