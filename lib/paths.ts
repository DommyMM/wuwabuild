import { Weapon } from '@/lib/weapon';
import { Echo } from '@/lib/echo';
import { CDN_BASE } from '@/lib/constants/cdn';

export const getWeaponPaths = (weapon: Weapon | null): string => {
  if (!weapon) return '/images/Resources/Weapon.png';
  return weapon.iconUrl ?? '';
};

export const getEchoPaths = (echo: Echo | null, isPhantom?: boolean): string => {
  if (!echo) return `${CDN_BASE}/p/GameData/UIResources/UiRole/Atlas/SP_RoleTabiconyiyin.png`;
  if (isPhantom && echo.phantomIconUrl) return echo.phantomIconUrl;
  return echo.iconUrl;
};
