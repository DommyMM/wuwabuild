export interface CardArtTransform {
  x: number;
  y: number;
  scale: number;
}

export type CardArtSourceMode = 'default' | 'custom';

export const DEFAULT_CARD_ART_TRANSFORM: CardArtTransform = {
  x: 0,
  y: 0,
  scale: 1,
};
