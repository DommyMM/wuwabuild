'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CardArtTransform } from '@/lib/cardArt';

type Rgb = { r: number; g: number; b: number };

export interface AdaptiveCardColors {
  primary: string;
  soft: string;
  faint: string;
  glow: string;
  edge: string;
  top: string;
  middle: string;
  bottom: string;
}

const PANEL_WIDTH = 432;
const PANEL_HEIGHT = 600;

const SAMPLE_BANDS = [
  { x: 0.06, y: 0.06, width: 0.88, height: 0.22, weight: 0.85 },
  { x: 0.06, y: 0.34, width: 0.88, height: 0.26, weight: 1.35 },
  { x: 0.06, y: 0.68, width: 0.88, height: 0.24, weight: 1.05 },
] as const;

const CHANNEL_HEX = 2;

const clampChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

const rgbToHex = ({ r, g, b }: Rgb) => (
  `#${[r, g, b].map((channel) => clampChannel(channel).toString(16).padStart(CHANNEL_HEX, '0')).join('')}`
);

const hexToRgb = (hex: string): Rgb => {
  const value = hex.replace('#', '');
  const normalized = value.length === 3
    ? value.split('').map((char) => `${char}${char}`).join('')
    : value.padEnd(6, '0').slice(0, 6);

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
};

const rgbToHsl = ({ r, g, b }: Rgb): { h: number; s: number; l: number } => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  let h = 0;

  if (delta !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
    if (max === gn) h = 60 * ((bn - rn) / delta + 2);
    if (max === bn) h = 60 * ((rn - gn) / delta + 4);
  }

  return { h: h < 0 ? h + 360 : h, s, l };
};

const hslToRgb = ({ h, s, l }: { h: number; s: number; l: number }): Rgb => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rn = 0;
  let gn = 0;
  let bn = 0;

  if (h < 60) [rn, gn, bn] = [c, x, 0];
  else if (h < 120) [rn, gn, bn] = [x, c, 0];
  else if (h < 180) [rn, gn, bn] = [0, c, x];
  else if (h < 240) [rn, gn, bn] = [0, x, c];
  else if (h < 300) [rn, gn, bn] = [x, 0, c];
  else [rn, gn, bn] = [c, 0, x];

  return {
    r: (rn + m) * 255,
    g: (gn + m) * 255,
    b: (bn + m) * 255,
  };
};

const polishColor = (rgb: Rgb): Rgb => {
  const hsl = rgbToHsl(rgb);
  return hslToRgb({
    h: hsl.h,
    s: Math.max(0.42, Math.min(0.9, hsl.s * 1.25)),
    l: Math.max(0.48, Math.min(0.72, hsl.l * 1.12)),
  });
};

const mix = (a: Rgb, b: Rgb, amount: number): Rgb => ({
  r: a.r + (b.r - a.r) * amount,
  g: a.g + (b.g - a.g) * amount,
  b: a.b + (b.b - a.b) * amount,
});

const toColorSet = (baseHex: string, sampled?: { primary: Rgb; top: Rgb; middle: Rgb; bottom: Rgb }): AdaptiveCardColors => {
  const base = sampled?.primary ?? hexToRgb(baseHex);
  const primary = rgbToHex(polishColor(base));
  const top = rgbToHex(polishColor(sampled?.top ?? mix(base, hexToRgb(baseHex), 0.35)));
  const middle = rgbToHex(polishColor(sampled?.middle ?? base));
  const bottom = rgbToHex(polishColor(sampled?.bottom ?? mix(base, { r: 0, g: 0, b: 0 }, 0.18)));

  return {
    primary,
    soft: `${primary}24`,
    faint: `${primary}10`,
    glow: `${primary}38`,
    edge: `${primary}45`,
    top: `${top}5e`,
    middle: `${middle}40`,
    bottom: `${bottom}48`,
  };
};

const averagePixels = (data: Uint8ClampedArray, fallback: Rgb): Rgb => {
  let r = 0;
  let g = 0;
  let b = 0;
  let total = 0;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    if (alpha < 0.08) continue;

    const saturation = rgbToHsl({ r: data[i], g: data[i + 1], b: data[i + 2] }).s;
    const weight = alpha * (0.45 + saturation);
    r += data[i] * weight;
    g += data[i + 1] * weight;
    b += data[i + 2] * weight;
    total += weight;
  }

  if (total <= 0) return fallback;
  return { r: r / total, g: g / total, b: b / total };
};

const weightedAverage = (samples: Array<{ color: Rgb; weight: number }>, fallback: Rgb): Rgb => {
  let r = 0;
  let g = 0;
  let b = 0;
  let total = 0;

  samples.forEach(({ color, weight }) => {
    r += color.r * weight;
    g += color.g * weight;
    b += color.b * weight;
    total += weight;
  });

  if (total <= 0) return fallback;
  return { r: r / total, g: g / total, b: b / total };
};

const drawRenderedPanelArt = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  transform: CardArtTransform,
) => {
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  if (!naturalWidth || !naturalHeight) return;

  const renderedHeight = PANEL_HEIGHT;
  const renderedWidth = (naturalWidth / naturalHeight) * renderedHeight;
  const x = (PANEL_WIDTH - renderedWidth) / 2;
  const y = PANEL_HEIGHT - renderedHeight;

  ctx.clearRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT);
  ctx.translate(PANEL_WIDTH / 2, PANEL_HEIGHT);
  ctx.scale(transform.scale, transform.scale);
  ctx.translate(-PANEL_WIDTH / 2 + transform.x, -PANEL_HEIGHT + transform.y);
  ctx.drawImage(image, x, y, renderedWidth, renderedHeight);
};

const sampleImage = async (
  artUrl: string,
  transform: CardArtTransform,
  fallbackHex: string,
): Promise<AdaptiveCardColors> => {
  const fallback = hexToRgb(fallbackHex);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load card art for color sampling.'));
    img.src = artUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = PANEL_WIDTH;
  canvas.height = PANEL_HEIGHT;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return toColorSet(fallbackHex);

  drawRenderedPanelArt(ctx, image, transform);

  const samples = SAMPLE_BANDS.map((band) => {
    const x = Math.round(PANEL_WIDTH * band.x);
    const y = Math.round(PANEL_HEIGHT * band.y);
    const width = Math.round(PANEL_WIDTH * band.width);
    const height = Math.round(PANEL_HEIGHT * band.height);
    const swatch = ctx.getImageData(
      x,
      y,
      Math.min(width, PANEL_WIDTH - x),
      Math.min(height, PANEL_HEIGHT - y),
    );
    return {
      color: averagePixels(swatch.data, fallback),
      weight: band.weight,
    };
  });

  return toColorSet(fallbackHex, {
    primary: weightedAverage(samples, fallback),
    top: samples[0]?.color ?? fallback,
    middle: samples[1]?.color ?? fallback,
    bottom: samples[2]?.color ?? fallback,
  });
};

export const useAdaptiveCardColors = (
  artUrl: string | null,
  transform: CardArtTransform,
  fallbackHex: string,
): AdaptiveCardColors => {
  const fallbackColors = useMemo(() => toColorSet(fallbackHex), [fallbackHex]);
  const sampleKey = `${artUrl ?? 'none'}:${fallbackHex}:${transform.x}:${transform.y}:${transform.scale}`;
  const [sampled, setSampled] = useState<{ key: string; colors: AdaptiveCardColors } | null>(null);

  useEffect(() => {
    if (!artUrl) return;

    let cancelled = false;
    sampleImage(artUrl, transform, fallbackHex)
      .then((next) => {
        if (!cancelled) setSampled({ key: sampleKey, colors: next });
      })
      .catch(() => {
        if (!cancelled) setSampled(null);
      });

    return () => {
      cancelled = true;
    };
  }, [artUrl, fallbackHex, sampleKey, transform]);

  return sampled?.key === sampleKey ? sampled.colors : fallbackColors;
};
