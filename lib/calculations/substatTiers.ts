// Substat roll quality tiers — 4 tiers, 2 rolls per tier (quartiles).
// Thresholds are midpoints between adjacent roll values from Substats.json.
//
// Tier 4 (gold)   — top 25%    rolls 7-8
// Tier 3 (purple) — upper-mid  rolls 5-6
// Tier 2 (blue)   — lower-mid  rolls 3-4
// Tier 1 (cyan)   — bottom 25% rolls 1-2

// [tier1→2, tier2→3, tier3→4] boundary values
const THRESHOLDS: Record<string, [number, number, number]> = {
  'Crit Rate':                        [7.2,  8.4,  9.6 ],  // [6.3,6.9 | 7.5,8.1 | 8.7,9.3 | 9.9,10.5]
  'Crit DMG':                         [14.4, 16.8, 19.2],  // [12.6,13.8 | 15,16.2 | 17.4,18.6 | 19.8,21]
  'HP%':                              [7.5,  9.0,  10.5],  // [6.4,7.1 | 7.9,8.6 | 9.4,10.1 | 10.9,11.6]
  'ATK%':                             [7.5,  9.0,  10.5],
  'DEF%':                             [9.5,  11.35, 13.3], // [8.1,9.0 | 10.0,10.9 | 11.8,12.8 | 13.8,14.7]
  'Energy Regen':                     [8.0,  9.6,  11.2],  // [6.8,7.6 | 8.4,9.2 | 10.0,10.8 | 11.6,12.4]
  'Basic Attack DMG Bonus':           [7.5,  9.0,  10.5],
  'Heavy Attack DMG Bonus':           [7.5,  9.0,  10.5],
  'Resonance Skill DMG Bonus':        [7.5,  9.0,  10.5],
  'Resonance Liberation DMG Bonus':   [7.5,  9.0,  10.5],
  'HP':  [375, 450, 525],  // [320,360 | 390,430 | 470,510 | 540,580]
  'ATK': [35,  45,  55 ],  // [30 | 40 | 50 | 60] — 4 values, one per tier
  'DEF': [45,  55,  65 ],  // [40 | 50 | 60 | 70]
};

// Tier colors: gold > purple > blue > cyan
const TIER_COLORS = ['#00FFFF', '#4D96FF', '#B46BFF', '#E6B800'] as const;

/**
 * Returns the hex color for a substat roll's quality tier, or null if the
 * stat type is unrecognised.
 */
export const getSubstatTierColor = (statType: string, value: number): string | null => {
  const thresholds = THRESHOLDS[statType];
  if (!thresholds) return null;

  const [t1, t2, t3] = thresholds;
  if (value >= t3) return TIER_COLORS[3]; // gold
  if (value >= t2) return TIER_COLORS[2]; // purple
  if (value >= t1) return TIER_COLORS[1]; // blue
  return TIER_COLORS[0];                  // cyan
};
