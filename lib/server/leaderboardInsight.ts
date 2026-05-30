import 'server-only';
import { prefetchLeaderboard } from '@/lib/lbServer';
import { loadFetterNames, loadWeaponNames } from './gameData';

export interface LeaderboardInsight {
    sampleSize: number;
    topWeaponName: string | null;
    topWeaponPct: number;
    topSetName: string | null;
    medianCv: number;
    peakDamage: number;
}

const MIN_SAMPLE = 5;

function mostCommon(counts: Record<string, number>): { key: string; count: number } | null {
    let bestKey: string | null = null;
    let bestCount = 0;
    for (const [key, count] of Object.entries(counts)) {
        if (count > bestCount) {
            bestCount = count;
            bestKey = key;
        }
    }
    return bestKey ? { key: bestKey, count: bestCount } : null;
}

/**
 * Derives a unique, data-driven summary of how the top-ranked builds for a character are actually played
 * Returns null when there isn't enough data to be meaningful (caller renders nothing).
 *
 * Reads only the default board (top builds by damage)
 */
export async function getLeaderboardInsight(characterId: string): Promise<LeaderboardInsight | null> {
    const data = await prefetchLeaderboard(characterId);
    const builds = data?.builds ?? [];
    if (builds.length < MIN_SAMPLE) return null;

    const weaponNames = loadWeaponNames();
    const fetterNames = loadFetterNames();

    // Most common weapon (players keep their own weapon even on a weapon-scoped board).
    const weaponCounts: Record<string, number> = {};
    for (const b of builds) {
        const id = b.weapon?.id;
        if (id) weaponCounts[id] = (weaponCounts[id] ?? 0) + 1;
    }
    const topWeapon = mostCommon(weaponCounts);

    // Most common dominant echo set (a set worn at 5 pieces).
    const setCounts: Record<string, number> = {};
    for (const b of builds) {
        const sets = b.echoSummary?.sets ?? {};
        let domId: string | null = null;
        let domCount = 0;
        for (const [setId, count] of Object.entries(sets)) {
            if (count > domCount) {
                domCount = count;
                domId = setId;
            }
        }
        if (domId && domCount >= 5) setCounts[domId] = (setCounts[domId] ?? 0) + 1;
    }
    const topSet = mostCommon(setCounts);

    // Median Crit Value.
    const cvs = builds
        .map((b) => b.finalCV || b.cv)
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => a - b);
    const medianCv = cvs.length ? Math.round(cvs[Math.floor(cvs.length / 2)]) : 0;

    // Peak simulated damage (0 for healing/score tracks)
    const peakDamage = Math.max(0, ...builds.map((b) => b.damage || 0));

    return {
        sampleSize: builds.length,
        topWeaponName: topWeapon ? weaponNames[topWeapon.key] ?? null : null,
        topWeaponPct: topWeapon ? Math.round((topWeapon.count / builds.length) * 100) : 0,
        topSetName: topSet ? fetterNames[topSet.key] ?? null : null,
        medianCv,
        peakDamage,
    };
}

/** Render the insight as a server-rendered prose sentence for the character page. */
export function formatInsightProse(characterName: string, insight: LeaderboardInsight): string {
    const lead = `Among the top ${insight.sampleSize} ranked ${characterName} builds on WuWaBuilds`;

    let setup = '';
    if (insight.topWeaponName) {
        setup = `${insight.topWeaponPct}% run ${insight.topWeaponName}`;
        if (insight.topSetName) setup += `, most paired with the ${insight.topSetName} echo set`;
    } else if (insight.topSetName) {
        setup = `most run the ${insight.topSetName} echo set`;
    }
    const sentence1 = setup ? `${lead}, ${setup}.` : `${lead}.`;

    const stats: string[] = [];
    if (insight.medianCv > 0) stats.push(`a median Crit Value of ${insight.medianCv}`);
    if (insight.peakDamage > 0) {
        stats.push(`peak simulated damage around ${insight.peakDamage.toLocaleString('en-US')}`);
    }
    const sentence2 = stats.length ? ` Top-ranked players post ${stats.join(' and ')}.` : '';

    return sentence1 + sentence2;
}
