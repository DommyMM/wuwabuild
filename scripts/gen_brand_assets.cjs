/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Generate WuWaBuilds brand assets from the tacet sigil.
 * Source: lib/server/brand/tacet-source.png (a Wuthering Waves tacet mark, black-on-light).
 *
 * Produces, into lib/server/brand/:
 *   - tacet-silhouette.png        full waveform, white shape on transparent (master mask)
 *   - tacet-burst.png             cropped central burst (compact mark mask)
 *   - wave-<element>.png          full waveform tinted per element + gold
 *   - burst-gold.png              gold compact mark (brand stamp)
 *
 * Favicon / PWA icons are NOT generated here; those keep the WB monogram.
 * The tacet waveform is the OG-card identity only.
 *
 * Run:  node scripts/gen_brand_assets.cjs   (from the wuwabuilds/ dir)
 */
const path = require('node:path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const BRAND = path.join(ROOT, 'lib', 'server', 'brand');
const SRC = path.join(BRAND, 'tacet-source.png');

const smoothstep = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// --- color helpers ---
const hex = (h) => {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = ([r, g, b]) =>
  '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const lighten = (c, t) => mix(hex(c), [255, 255, 255], t);
const darken = (c, t) => mix(hex(c), [10, 10, 12], t);

// vertical metallic gradient stops for a base element color
const elementStops = (base) =>
  `<stop offset="0" stop-color="${toHex(lighten(base, 0.55))}"/>` +
  `<stop offset=".5" stop-color="${base}"/>` +
  `<stop offset="1" stop-color="${toHex(darken(base, 0.32))}"/>`;

const PALETTES = {
  gold:
    '<stop offset="0" stop-color="#f7e9b6"/><stop offset=".30" stop-color="#e0ca87"/>' +
    '<stop offset=".52" stop-color="#c9b275"/><stop offset=".74" stop-color="#a8924f"/>' +
    '<stop offset="1" stop-color="#efdca0"/>',
  glacio: elementStops('#41AEFB'),
  fusion: elementStops('#F0744E'),
  electro: elementStops('#B46BFF'),
  aero: elementStops('#55FFB5'),
  spectro: elementStops('#F8E56C'),
  havoc: elementStops('#E649A6'),
  // rover = multi-element rainbow
  rover:
    '<stop offset="0" stop-color="#F0744E"/><stop offset=".2" stop-color="#41AEFB"/>' +
    '<stop offset=".4" stop-color="#55FFB5"/><stop offset=".6" stop-color="#B46BFF"/>' +
    '<stop offset=".8" stop-color="#F8E56C"/><stop offset="1" stop-color="#E649A6"/>',
};

const gradSvg = (w, h, stops) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient></defs>` +
      `<rect width="${w}" height="${h}" fill="url(#g)"/></svg>`
  );

const bake = (silPath, stops, out) =>
  sharp(silPath)
    .metadata()
    .then(({ width, height }) =>
      sharp(gradSvg(width, height, stops)).composite([{ input: silPath, blend: 'dest-in' }]).png().toFile(out)
    );

async function main() {
  // 1) silhouette (white shape, transparent bg), gated by source alpha + smoothstep threshold
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const out = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const r = data[i * C], g = data[i * C + 1], b = data[i * C + 2], sa = data[i * C + 3] / 255;
    const d = (1 - (0.299 * r + 0.587 * g + 0.114 * b) / 255) * sa;
    out[i * 4] = 255; out[i * 4 + 1] = 255; out[i * 4 + 2] = 255;
    out[i * 4 + 3] = Math.round(smoothstep(0.45, 0.72, d) * 255);
  }
  const silPath = path.join(BRAND, 'tacet-silhouette.png');
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).trim().png().toFile(silPath);

  // 2) central burst crop (compact mark)
  const sil = await sharp(silPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const sw = sil.info.width, sh = sil.info.height, sc = sil.info.channels;
  let peakX = 0, peakH = -1;
  for (let x = 0; x < sw; x++) {
    let t = -1, btm = -1;
    for (let y = 0; y < sh; y++) if (sil.data[(y * sw + x) * sc + 3] > 50) { if (t < 0) t = y; btm = y; }
    const h = t < 0 ? 0 : btm - t;
    if (h > peakH) { peakH = h; peakX = x; }
  }
  const cw = Math.round(sw * 0.30);
  const xL = Math.max(0, peakX - (cw >> 1));
  const burstPath = path.join(BRAND, 'tacet-burst.png');
  await sharp(silPath).extract({ left: xL, top: 0, width: Math.min(cw, sw - xL), height: sh }).trim().png().toFile(burstPath);

  // 3) tinted full waves
  for (const [k, stops] of Object.entries(PALETTES)) {
    await bake(silPath, stops, path.join(BRAND, `wave-${k}.png`));
  }
  // 4) gold burst (brand stamp)
  await bake(burstPath, PALETTES.gold, path.join(BRAND, 'burst-gold.png'));

  console.log('brand assets:', Object.keys(PALETTES).map((k) => 'wave-' + k).join(', '));
  console.log('silhouette', `${sw}x${sh}`, '· burst peakX', peakX);
}
main().catch((e) => { console.error(e); process.exit(1); });
