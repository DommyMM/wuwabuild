import { Weapon } from '@/lib/weapon';
import { Echo } from '@/lib/echo';

const ELEMENT_NAME_MAP: Record<string, string> = {
  'Havoc': 'Dark',
  'Fusion': 'Fire',
  'Glacio': 'Ice',
  'Spectro': 'Light',
  'Electro': 'Thunder',
  'Aero': 'Wind'
};

const CDN_BASE = 'https://files.wuthery.com/p/GameData/UIResources/Common';

/** Used by SequenceSelector for sequence icon URLs. */
export const PATHS = {
  cdn: {
    base: CDN_BASE,
  },
};

export const getWeaponPaths = (weapon: Weapon | null): string => {
  if (!weapon) return '/images/Resources/Weapon.png';
  return weapon.iconUrl ?? '';
};

export const getEchoPaths = (echo: Echo | null, isPhantom?: boolean): string => {
  if (!echo) return 'https://files.wuthery.com/p/GameData/UIResources/UiRole/Atlas/SP_RoleTabiconyiyin.png';
  if (isPhantom && echo.phantomIconUrl) return echo.phantomIconUrl;
  return echo.iconUrl;
};

export const getElementPaths = (element: string): string => {
  const cdnName = ELEMENT_NAME_MAP[element];
  return `${CDN_BASE}/Image/IconElementShine/T_IconElement${cdnName}2_UI.png`;
};
