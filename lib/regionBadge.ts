// Leaf module so the nav's profile search can badge a UID without pulling lib/lb into the root bundle

export type RegionBadge = {
  label: string;
  className: string;
};

/** Server region by the UID's first digit */
export const REGION_BADGES: Record<string, RegionBadge> = {
  '1': { label: 'CN', className: 'bg-red-500/85 text-white' },
  '5': { label: 'NA', className: 'bg-amber-400/90 text-black' },
  '6': { label: 'EU', className: 'bg-indigo-400/90 text-black' },
  '7': { label: 'Asia', className: 'bg-lime-300/90 text-black' },
  '9': { label: 'SEA', className: 'bg-cyan-300/90 text-black' },
};

export function resolveRegionBadge(uid: string | undefined): RegionBadge | null {
  if (!uid) return null;
  const prefix = uid.trim()[0];
  return REGION_BADGES[prefix] ?? null;
}
