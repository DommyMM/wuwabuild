export interface CardArtTransform {
  x: number;
  y: number;
  scale: number;
}

export type CardArtSourceMode = 'default' | 'custom';

export const ART_ZOOM_STEP = 0.05;
export const MIN_ART_ZOOM = 1;
export const MAX_ART_ZOOM = 4;

export const DEFAULT_CARD_ART_TRANSFORM: CardArtTransform = {
  x: 0,
  y: 0,
  scale: 1,
};
