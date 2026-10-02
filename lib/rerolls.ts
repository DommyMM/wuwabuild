import { LBRerollLine, LBRerolls, LBSubstatLadder } from '@/lib/lb';

/**
 * Share of Score one roll must average for a line to count as a way to roll
 *
 * On a top Hiyuki build the real candidates average 0.05% to 0.27% a roll and the next line down 0.016%
 */
const LINE_THRESHOLD = 0.0002;
/** Lines kept when none clears the threshold, so a near-finished build still sees its best options */
const LINE_FALLBACK_COUNT = 3;
/** Share of Score a stat's best roll must gain to be listed, so a result worth a hundredth of a percent is not one */
const STAT_FLOOR = 0.002;

/** One stat a way can land, across every roll of it that gains */
export interface RerollTarget {
  key: string;
  ladder: LBSubstatLadder;
  /** Lowest roll that gains */
  minValue: number;
  /** True when a lower roll of the stat exists and does not gain */
  hasFloor: boolean;
  /** Gain at the lowest gaining roll and at the top roll, as shares of the current Score */
  minGain: number;
  maxGain: number;
  /** Best rank the stat reaches, 0 when no roll beats the current rank */
  rank: number;
  /** Lowest roll that reaches `rank` */
  rankValue: number;
  /** Chance one roll lands the stat at a roll that gains */
  chance: number;
}

/** A line a way redraws, with a null ladder for a slot that holds no stat yet */
export interface RerollLineRef {
  ladder: LBSubstatLadder | null;
  value: number;
}

/** Why a line is worth rolling: it adds next to nothing now, or its own stat gains at a higher roll */
export type RerollReason = 'unused' | 'low-roll' | null;

/** One choice of lines to redraw on an echo, with what it can land */
export interface RerollWay {
  key: string;
  /** 0-based echo slot in the build state */
  echo: number;
  lines: RerollLineRef[];
  reason: RerollReason;
  /** Transducers one roll spends */
  cost: number;
  /** Mean share of Score gained per transducer, every worse result declined */
  expected: number;
  /** Largest share of the way's mean gain first */
  targets: RerollTarget[];
}

export interface RerollModel {
  score: number;
  currentRank: number;
  /** Most gain per transducer first */
  ways: RerollWay[];
}

type Candidate = RerollTarget & { expected: number };

function buildTarget(
  line: LBRerollLine,
  ladder: LBSubstatLadder,
  scores: number[],
  ranks: number[],
  score: number,
  currentRank: number,
): Candidate | null {
  const gaining: Array<{ value: number; gain: number; rank: number; chance: number }> = [];
  ladder.values.forEach((value, index) => {
    const rollScore = scores[index] ?? score;
    if (rollScore <= score) return;
    gaining.push({
      value,
      gain: rollScore / score - 1,
      rank: ranks[index] ?? 0,
      chance: line.pool > 0 ? (ladder.odds[index] ?? 0) / line.pool : 0,
    });
  });
  if (gaining.length === 0) return null;

  // More of a stat never scores lower, so the top roll holds the best gain and the best rank
  const top = gaining[gaining.length - 1];
  const improves = top.rank > 0 && (currentRank <= 0 || top.rank < currentRank);
  return {
    key: `${line.echo}-${line.line}-${ladder.stat}`,
    ladder,
    minValue: gaining[0].value,
    hasFloor: gaining[0].value !== ladder.values[0],
    minGain: gaining[0].gain,
    maxGain: top.gain,
    rank: improves ? top.rank : 0,
    rankValue: improves ? (gaining.find((roll) => roll.rank === top.rank) ?? top).value : 0,
    chance: gaining.reduce((sum, roll) => sum + roll.chance, 0),
    expected: gaining.reduce((sum, roll) => sum + roll.chance * roll.gain, 0),
  };
}

function buildWay(line: LBRerollLine, data: LBRerolls, ladderByStat: Map<string, LBSubstatLadder>): RerollWay {
  const candidates = line.stats
    .map((stat) => {
      const ladder = ladderByStat.get(stat.stat);
      return ladder ? buildTarget(line, ladder, stat.scores, stat.ranks, data.score, data.currentRank) : null;
    })
    .filter((candidate): candidate is Candidate => candidate !== null)
    .sort((a, b) => b.expected - a.expected);
  const listed = candidates.filter((candidate) => candidate.maxGain >= STAT_FLOOR);
  // A line whose every gain sits under the floor still lists its best stat, or the way would be empty
  const targets = listed.length > 0 ? listed : candidates.slice(0, 1);
  const cost = Math.max(1, data.rollCost);
  // A line worth less than a listed result reads as unused, the same cut the targets take
  const unused = line.stat === '' || 1 - line.scoreWithout / data.score < STAT_FLOOR;
  return {
    key: `${line.echo}-${line.line}`,
    echo: line.echo,
    lines: [{ ladder: ladderByStat.get(line.stat) ?? null, value: line.value }],
    reason: unused ? 'unused' : targets.some((target) => target.ladder.stat === line.stat) ? 'low-roll' : null,
    cost,
    expected: line.expectedGain / data.score / cost,
    targets,
  };
}

/** Picks the lines worth rerolling, as ways to roll with the stats each can land */
export function buildRerollModel(data: LBRerolls): RerollModel {
  const ladderByStat = new Map(data.ladders.map((ladder) => [ladder.stat, ladder]));

  const gaining = data.lines
    .filter((line) => line.expectedGain > 0)
    .sort((a, b) => b.expectedGain - a.expectedGain || a.echo - b.echo || a.line - b.line);
  const worthRolling = gaining.filter((line) => line.expectedGain / data.score >= LINE_THRESHOLD);
  const kept = worthRolling.length > 0 ? worthRolling : gaining.slice(0, LINE_FALLBACK_COUNT);

  const ways = kept
    .map((line) => buildWay(line, data, ladderByStat))
    .filter((way) => way.targets.length > 0)
    .sort((a, b) => b.expected - a.expected);

  return { score: data.score, currentRank: data.currentRank, ways };
}

/** "+0.69–1.38%" for the span of a target's gain, one figure when both ends print alike */
export function formatGainRange(min: number, max: number): string {
  const low = formatGain(min);
  const high = formatGain(max);
  return low === high ? high : `${low.slice(0, -1)}–${high.slice(1)}`;
}

/** "+1.25%" for a share of Score, with a third decimal under 0.1% so a small gain never prints as zero */
export function formatGain(gain: number): string {
  const percent = gain * 100;
  const magnitude = Math.abs(percent);
  const digits = magnitude > 0 && magnitude < 0.095 ? 3 : 2;
  return `${percent < 0 ? '−' : '+'}${magnitude.toFixed(digits)}%`;
}

/** "11.1%" for a chance, with a second decimal under 1% so a long shot never prints as zero */
export function formatChance(chance: number): string {
  if (!(chance > 0)) return '—';
  const percent = chance * 100;
  return `${percent.toFixed(percent < 0.95 ? 2 : 1)}%`;
}
