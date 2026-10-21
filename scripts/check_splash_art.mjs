// Fails when public/images/splash and SPLASH_ART_TRANSFORMS in lib/splashArt.ts disagree
//
// Usage: node scripts/check_splash_art.mjs (runs inside npm run lint)
// A file without an entry would never be offered, an entry without a file would 404 on every card that picks it
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'lib/splashArt.ts'), 'utf8');
const block = source.split('SPLASH_ART_TRANSFORMS: Record')[1]?.split('};')[0] ?? '';
const keys = new Set([...block.matchAll(/^\s*'([\w-]+)':/gm)].map((m) => m[1]));
const files = new Set(
  fs.readdirSync(path.join(root, 'public/images/splash'))
    .filter((name) => name.endsWith('.webp'))
    .map((name) => name.slice(0, -'.webp'.length)),
);

const untuned = [...files].filter((stem) => !keys.has(stem)).sort();
const orphaned = [...keys].filter((stem) => !files.has(stem)).sort();
if (untuned.length) {
  console.error(`Splash files with no SPLASH_ART_TRANSFORMS entry: ${untuned.join(', ')}`);
  console.error('  py scripts/splash_framing.py prints a starting entry for each');
}
if (orphaned.length) console.error(`SPLASH_ART_TRANSFORMS entries with no file: ${orphaned.join(', ')}`);
if (untuned.length || orphaned.length) process.exit(1);
console.log(`Splash art: ${files.size} files, all framed`);
