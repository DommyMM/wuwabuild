import { LBRerollLine, LBRerolls, LBSubstatLadder } from '@/lib/lb';

/**
 * Share of Score one roll must average for a line to be worth a column group
 *
 * On a top Hiyuki build the real candidates average 0.05% to 0.27% a roll and the next line down 0.016%
 */
const LINE_THRESHOLD = 0.0002;
/** Lines shown when none clears the threshold, so a near-finished build still sees its best options */
const LINE_FALLBACK_COUNT = 3;
/** Most lines shown, since the reader acts on the first few and re-uploads */
const LINE_LIMIT = 6;
/** Share of Score a stat's best roll must gain to get a column, so a result worth a hundredth of a percent is not one */
const STAT_FLOOR = 0.002;

/** How lucky a roll the table assumes: the lowest roll that gains, the typical gaining roll, or the highest */
export type RollTier = 'min' | 'mid' | 'max';

interface RerollResult {
  /** Roll value the line lands on */
  value: number;
  /** Gain as a share of the current Score */
  gain: number;
  score: number;
  /** Projected rank, 0 when unranked */
  rank: number;
  /** Chance one reroll of the line lands this stat at this roll or better */
  chance: number;
}

/** One stat a line can become */
interface RerollColumn {
  key: string;
  ladder: LBSubstatLadder;
  results: Record<RollTier, RerollResult>;
}

/** One line of one echo with the stats worth rerolling it into, best first */
interface RerollGroup {
  key: string;
  echo: number;
  /** Null for a slot that holds no stat yet */
  ladder: LBSubstatLadder | null;
  value: number;
  columns: RerollColumn[];
}

interface RerollModel {
  score: number;
  currentRank: number;
  /** Lines worth rerolling, best first */
  groups: RerollGroup[];
}

type Candidate = RerollColumn & { expected: number; maxGain: number };

function buildCandidate(line: LBRerollLine, ladder: LBSubstatLadder, scores: number[], ranks: number[], score: number): Candidate | null {
  const gaining: RerollResult[] = [];
  ladder.values.forEach((value, index) => {
    const rollScore = scores[index] ?? score;
    if (rollScore <= score) return;
    gaining.push({
      value,
      gain: rollScore / score - 1,
      score: rollScore,
      rank: ranks[index] ?? 0,
      chance: line.pool > 0 ? (ladder.odds[index] ?? 0) / line.pool : 0,
    });
  });
  if (gaining.length === 0) return null;

  // More of a stat never scores lower, so "this roll or better" is every gaining roll from it upward
  const atLeast = gaining.map((_, from) => gaining.slice(from).reduce((sum, roll) => sum + roll.chance, 0));
  // Typical gaining roll: the one where half the gaining odds sit at or below it
  const mid = Math.max(0, gaining.findIndex((_, index) => atLeast[0] - (atLeast[index + 1] ?? 0) >= atLeast[0] / 2));
  const top = gaining.length - 1;
  // A tier reports the lowest roll that reaches its Score, because a stat that only has to clear a threshold
  // (Energy Regen under its target) scores the same at every roll and must not read as needing a high one
  const result = (index: number): RerollResult => {
    const lowest = gaining.findIndex((roll) => roll.score >= gaining[index].score);
    return { ...gaining[lowest], chance: atLeast[lowest] };
  };
  return {
    key: `${line.echo}-${line.line}-${ladder.stat}`,
    ladder,
    results: { min: result(0), mid: result(mid), max: result(top) },
    expected: gaining.reduce((sum, roll) => sum + roll.chance * roll.gain, 0),
    maxGain: gaining[top].gain,
  };
}

/** Picks the lines worth rerolling and, for each, the stats worth a column */
export function buildRerollModel(data: LBRerolls): RerollModel {
  const ladderByStat = new Map(data.ladders.map((ladder) => [ladder.stat, ladder]));

  const ranked = data.lines
    .map((line) => ({ line, expected: line.expectedGain / data.score }))
    .filter((entry) => entry.expected > 0)
    .sort((a, b) => b.expected - a.expected || a.line.echo - b.line.echo || a.line.line - b.line.line);
  const worthRolling = ranked.filter((entry) => entry.expected >= LINE_THRESHOLD);
  const shown = (worthRolling.length > 0 ? worthRolling : ranked.slice(0, LINE_FALLBACK_COUNT)).slice(0, LINE_LIMIT);

  const groups = shown.map(({ line }): RerollGroup => {
    const candidates = line.stats
      .map((stat) => {
        const ladder = ladderByStat.get(stat.stat);
        return ladder ? buildCandidate(line, ladder, stat.scores, stat.ranks, data.score) : null;
      })
      .filter((candidate): candidate is Candidate => candidate !== null)
      .sort((a, b) => b.expected - a.expected);
    const columns = candidates.filter((candidate) => candidate.maxGain >= STAT_FLOOR);
    return {
      key: `${line.echo}-${line.line}`,
      echo: line.echo,
      ladder: ladderByStat.get(line.stat) ?? null,
      value: line.value,
      // A line whose every gain sits under the floor still shows its best stat, or the group would be empty
      columns: columns.length > 0 ? columns : candidates.slice(0, 1),
    };
  }).filter((group) => group.columns.length > 0);

  return { score: data.score, currentRank: data.currentRank, groups };
}

/** "+1.25%" for a share of Score, with a third decimal under 0.1% so a small gain never prints as zero */
export function formatGain(gain: number): string {
  const percent = gain * 100;
  const magnitude = Math.abs(percent);
  const digits = magnitude > 0 && magnitude < 0.095 ? 3 : 2;
  return `${percent < 0 ? '−' : '+'}${magnitude.toFixed(digits)}%`;
}

/** "1 in 9" for a chance, or a percentage once it is likelier than 1 in 3 */
export function formatOdds(chance: number): string {
  if (!(chance > 0)) return '—';
  if (chance >= 1 / 3) return `${Math.round(chance * 100)}%`;
  const oneIn = 1 / chance;
  return `1 in ${oneIn < 20 ? Number(oneIn.toFixed(1)) : Math.round(oneIn).toLocaleString()}`;
}
