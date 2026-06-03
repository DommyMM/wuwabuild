import 'server-only';
import fs from 'fs';
import path from 'path';
import { type CDNCharacter, adaptCDNCharacter, formatCharacterDisplayName, isRover } from '@/lib/character';
import { getSplashUrlCandidates } from '@/lib/splashArt';

type GenericRecord = Record<string, unknown>;

interface WeaponRecord {
  id?: string | number;
  name?: { en?: string };
  type?: { name?: { en?: string } };
  rarity?: { id?: number };
  icon?: string | { icon?: string; iconMiddle?: string; iconSmall?: string };
}

const DATA_DIR = path.join(process.cwd(), 'public', 'Data');
const jsonCache = new Map<string, unknown>();

function readJson(filename: string): unknown {
  const filePath = path.join(DATA_DIR, filename);
  if (jsonCache.has(filePath)) return jsonCache.get(filePath) ?? null;
  if (!fs.existsSync(filePath)) {
    jsonCache.set(filePath, null);
    return null;
  }
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  jsonCache.set(filePath, parsed);
  return parsed;
}

function i18nEn(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'en' in value) {
    const en = (value as { en?: unknown }).en;
    return typeof en === 'string' ? en : '';
  }
  return '';
}

function publicAssetExists(urlPath: string): boolean {
  if (!urlPath.startsWith('/')) return false;
  return fs.existsSync(path.join(process.cwd(), 'public', urlPath.slice(1)));
}

function resolveCharacterSplashUrl(raw: CDNCharacter): string | null {
  const char = adaptCDNCharacter(raw);
  const candidates = getSplashUrlCandidates(String(raw.id), raw.legacyId ?? null, isRover(char));
  return candidates.find(publicAssetExists) ?? null;
}

// --- Characters ---

export function loadCharacterRaw(id: string): CDNCharacter | null {
  const rawData = readJson('Characters.json');
  if (!rawData || typeof rawData !== 'object') return null;

  const entries: unknown[] = Array.isArray(rawData)
    ? rawData
    : Object.values(rawData as GenericRecord);

  const match = entries.find(
    (e) => e && typeof e === 'object' && 'id' in e && (e as { id?: string | number }).id?.toString() === id,
  );
  return (match as CDNCharacter | undefined) ?? null;
}

export function loadCharacterSummary(id: string) {
  const raw = loadCharacterRaw(id);
  if (!raw) return null;
  const char = adaptCDNCharacter(raw);
  return {
    name: formatCharacterDisplayName(char, { baseName: char.name, roverElement: undefined }),
    element: char.roverElementName ?? char.element,
    weaponType: char.weaponType,
    rarity: char.rarity ?? raw.rarity?.id ?? 5,
    bannerUrl: raw.icon?.banner ?? null,
    splashUrl: resolveCharacterSplashUrl(raw),
    iconRoundUrl: raw.icon?.iconRound ?? null,
    elementColor: raw.element?.color ?? null,
    rarityColor: raw.rarity?.color ?? null,
  };
}

/**
 * Map of character id → English display fields, for resolving leaderboard
 * character names/element/portrait server-side so the SSR HTML ships complete
 * instead of leaning on the client `GameDataContext` (which would flash
 * `Character {id}` until the ~6 MB client JSON fetch lands). Built once per
 * call from the same adapters the client uses, so values match exactly.
 */
export function loadCharacterDisplayMap(): Record<string, { name: string; element: string; head: string | null }> {
  const rawData = readJson('Characters.json');
  const entries: unknown[] = Array.isArray(rawData)
    ? rawData
    : rawData && typeof rawData === 'object'
      ? Object.values(rawData as GenericRecord)
      : [];

  const map: Record<string, { name: string; element: string; head: string | null }> = {};
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || !('id' in entry)) continue;
    try {
      const char = adaptCDNCharacter(entry as CDNCharacter);
      map[char.id] = {
        name: formatCharacterDisplayName(char, { baseName: char.name, roverElement: undefined }),
        element: char.element ? String(char.element).toLowerCase() : '',
        head: char.head ?? null,
      };
    } catch {
      // skip malformed character entries
    }
  }
  return map;
}

// --- Weapons ---

function normalizeWeaponsData(data: unknown): WeaponRecord[] {
  if (Array.isArray(data)) return data as WeaponRecord[];
  if (!data || typeof data !== 'object') return [];
  return Object.values(data as GenericRecord).flatMap((group) => {
    if (Array.isArray(group)) return group as WeaponRecord[];
    if (group && typeof group === 'object') return Object.values(group as GenericRecord) as WeaponRecord[];
    return [];
  });
}

function loadAllWeapons(): WeaponRecord[] {
  const rawData = readJson('Weapons.json');
  if (!rawData) return [];
  return normalizeWeaponsData(rawData);
}

function findWeapon(id: string): WeaponRecord | undefined {
  return loadAllWeapons().find((w) => w.id != null && w.id.toString() === id);
}

function getWeaponIconUrl(weapon: WeaponRecord): string | null {
  if (!weapon.icon) return null;
  if (typeof weapon.icon === 'string') return weapon.icon;
  return weapon.icon.iconMiddle || weapon.icon.icon || weapon.icon.iconSmall || null;
}

/** Map of weapon id → English name, for resolving leaderboard weapon ids server-side. */
export function loadWeaponNames(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const weapon of loadAllWeapons()) {
    if (weapon.id != null && weapon.name?.en) {
      map[String(weapon.id)] = weapon.name.en;
    }
  }
  return map;
}

/** Map of echo-set (fetter) id → English name. */
export function loadFetterNames(): Record<string, string> {
  const raw = readJson('Fetters.json');
  const entries: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object'
      ? Object.values(raw as GenericRecord)
      : [];

  const map: Record<string, string> = {};
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || !('id' in entry)) continue;
    const id = String((entry as { id?: unknown }).id);
    const name = i18nEn((entry as { name?: unknown }).name);
    if (id && name) map[id] = name;
  }
  return map;
}

export function loadWeaponSummary(id: string) {
  const weapon = findWeapon(id);
  if (!weapon?.name?.en) return null;
  return {
    name: weapon.name.en,
    weaponType: weapon.type?.name?.en ?? 'Weapon',
    rarity: weapon.rarity?.id ?? 5,
    iconUrl: getWeaponIconUrl(weapon),
  };
}
