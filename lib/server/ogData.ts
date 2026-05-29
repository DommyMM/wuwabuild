import 'server-only';
import fs from 'fs';
import path from 'path';
import { type CDNCharacter, adaptCDNCharacter, formatCharacterDisplayName } from '@/lib/character';

type GenericRecord = Record<string, unknown>;

interface WeaponRecord {
  id?: string | number;
  name?: { en?: string };
  type?: { name?: { en?: string } };
  rarity?: { id?: number };
  icon?: string;
}

const DATA_DIR = path.join(process.cwd(), 'public', 'Data');

function readJson(filename: string): unknown {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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

export interface CharacterIndexEntry {
  id: string;
  name: string;
  element: string;
  elementColor: string | null;
  weaponType: string;
  iconRound: string | null;
  rarity: number;
}

function i18nEn(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'en' in value) {
    const en = (value as { en?: unknown }).en;
    return typeof en === 'string' ? en : '';
  }
  return '';
}

/**
 * Lean character list for the homepage directory grid. Reads Characters.json
 * server-side and extracts only the fields the grid needs — never ships the
 * full ~6.5MB payload to the client. Sorted by rarity desc, then name.
 */
export function loadCharacterIndex(): CharacterIndexEntry[] {
  const rawData = readJson('Characters.json');
  if (!rawData || typeof rawData !== 'object') return [];

  const entries: unknown[] = Array.isArray(rawData)
    ? rawData
    : Object.values(rawData as GenericRecord);

  const result: CharacterIndexEntry[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const c = entry as CDNCharacter & {
      element?: { name?: unknown; color?: string };
      weapon?: { name?: unknown };
      icon?: { iconRound?: string };
      rarity?: { id?: number };
    };
    const id = c.id?.toString();
    const baseName = i18nEn(c.name);
    if (!id || !baseName) continue;

    const element = i18nEn(c.element?.name);
    // Rover variants share the name "Rover" — disambiguate by element.
    const name = baseName === 'Rover' && element ? `Rover (${element})` : baseName;

    result.push({
      id,
      name,
      element,
      elementColor: c.element?.color ?? null,
      weaponType: i18nEn(c.weapon?.name),
      iconRound: c.icon?.iconRound ?? null,
      rarity: c.rarity?.id ?? 5,
    });
  }

  result.sort((a, b) => (b.rarity - a.rarity) || a.name.localeCompare(b.name));
  return result;
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
    iconRoundUrl: raw.icon?.iconRound ?? null,
    elementColor: raw.element?.color ?? null,
    rarityColor: raw.rarity?.color ?? null,
  };
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

export function loadWeaponSummary(id: string) {
  const weapon = findWeapon(id);
  if (!weapon?.name?.en) return null;
  return {
    name: weapon.name.en,
    weaponType: weapon.type?.name?.en ?? 'Weapon',
    rarity: weapon.rarity?.id ?? 5,
    iconUrl: weapon.icon ?? null,
  };
}
