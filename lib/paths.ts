import { Weapon } from '@/lib/weapon';
import { Echo } from '@/lib/echo';

export const getWeaponPaths = (weapon: Weapon | null): string => {
  if (!weapon) return '/images/Resources/Weapon.png';
  return weapon.iconUrl ?? '';
};

export const getEchoPaths = (echo: Echo | null, isPhantom?: boolean): string => {
  if (!echo) return '/assets/UIResources/UiRole/Atlas/SP_RoleTabiconyiyin.webp';
  if (isPhantom && echo.phantomIconUrl) return echo.phantomIconUrl;
  return echo.iconUrl;
};
