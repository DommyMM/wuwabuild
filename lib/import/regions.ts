export const IMPORT_REGION_KEYS = [
  'character',
  'watermark',
  'forte',
  'sequences',
  'weapon',
  'echo1',
  'echo2',
  'echo3',
  'echo4',
  'echo5',
] as const;

export type RegionKey = typeof IMPORT_REGION_KEYS[number];
