import { Weapon } from '@/lib/weapon';
import { Echo } from '@/lib/echo';
import { CDN_BASE, CDN_UI_COMMON_BASE } from '@/lib/constants/cdn';

const ELEMENT_NAME_MAP: Record<string, string> = {
  'Havoc': 'Dark',
  'Fusion': 'Fire',
  'Glacio': 'Ice',
  'Spectro': 'Light',
  'Electro': 'Thunder',
  'Aero': 'Wind'
};

// Used by SequenceSelector for sequence icon URLs.
export const PATHS = {
  cdn: {
    base: CDN_UI_COMMON_BASE,
  },
};

export const getWeaponPaths = (weapon: Weapon | null): string => {
  if (!weapon) return '/images/Resources/Weapon.png';
  return weapon.iconUrl ?? '';
};

export const getEchoPaths = (echo: Echo | null, isPhantom?: boolean): string => {
  if (!echo) return `${CDN_BASE}/p/GameData/UIResources/UiRole/Atlas/SP_RoleTabiconyiyin.png`;
  if (isPhantom && echo.phantomIconUrl) return echo.phantomIconUrl;
  return echo.iconUrl;
};

export const getElementPaths = (element: string): string => {
  const cdnName = ELEMENT_NAME_MAP[element];
  return `${CDN_UI_COMMON_BASE}/Image/IconElementShine/T_IconElement${cdnName}2_UI.png`;
};
