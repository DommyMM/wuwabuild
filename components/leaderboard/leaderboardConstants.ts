// # | Owner | Character | Sets | [CV+Stats+Damage]
export const LB_TABLE_GRID = 'grid-cols-[48px_178px_178px_88px_minmax(0,1fr)]';
export const LB_SORTABLE_GROUP_GRID = 'grid-cols-[172px_repeat(4,121px)_minmax(140px,1fr)]';
export const DEFAULT_LB_SORT = 'damage';
export const DEFAULT_LB_TRACK = 's0';

// Sequence badge border/bg/text colors — index = sequence level 0–6
export const LB_SEQ_BADGE_COLORS = [
  '',  // S0 — no badge shown
  'border-cyan-400/45 bg-cyan-500/15 text-cyan-200',
  'border-blue-400/45 bg-blue-500/15 text-blue-200',
  'border-violet-400/45 bg-violet-500/15 text-violet-200',
  'border-fuchsia-400/45 bg-fuchsia-500/15 text-fuchsia-200',
  'border-amber-400/55 bg-amber-500/20 text-amber-200',
  'border-spectro/60 bg-spectro/20 text-spectro',
] as const;

/** Parse sequence level from a track key, e.g. "s2_solo" → 2, "s0" → 0. */
export function parseLBSeqLevel(trackKey: string): number {
  const m = trackKey.match(/^s(\d+)/);
  return m ? Math.min(6, parseInt(m[1], 10)) : 0;
}

/** Generate a short description for a leaderboard track. */
export function getLBTrackExcerpt(trackKey: string, teamCount: number): string {
  const isSolo = trackKey.includes('solo') || teamCount === 0;
  if (isSolo) return 'Solo benchmark — no external team buffs applied.';
  return `Full team benchmark with ${teamCount} support resonator${teamCount !== 1 ? 's' : ''}.`;
}
