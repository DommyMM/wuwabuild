import React, { ReactNode } from 'react';
import { CDNFetter } from '@/lib/echo';

const PLACEHOLDER_PATTERN = /\{(\d+)\}/g;

export interface RenderTemplateWithHighlightsArgs {
  template: string;
  getParamValue: (index: number) => string | null;
  highlightClassName?: string;
  keepUnknownPlaceholders?: boolean;
  unknownPlaceholderClassName?: string;
}

export interface FetterPieceDescriptionResult {
  renderedParts: ReactNode;
  unresolvedCount: number;
}

export type FetterPieceEffect = NonNullable<CDNFetter['pieceEffects']>[string];
interface ResolveFetterPieceOptions {
  descriptionTemplate?: string;
}

const formatNumber = (value: number): string => {
  const rounded = Math.round(value * 10000) / 10000;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded).replace(/(\.\d*?[1-9])0+$/u, '$1').replace(/\.0+$/u, '');
};

export const stripGameMarkup = (input: string): string => {
  if (!input) return '';

  return input
    .replace(/<br\s*\/?>/giu, '\n')
    .replace(/<\/?[^>]+>/gu, '')
    .replace(/\r\n/gu, '\n')
    .replace(/[ \t]+\n/gu, '\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim();
};

export const renderTemplateWithHighlights = ({
  template,
  getParamValue,
  highlightClassName = 'text-cyan-200 font-semibold',
  keepUnknownPlaceholders = true,
  unknownPlaceholderClassName = 'text-amber-200/90 font-semibold',
}: RenderTemplateWithHighlightsArgs): ReactNode => {
  if (!template) return null;

  const parts: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const match of template.matchAll(PLACEHOLDER_PATTERN)) {
    const indexStart = match.index ?? 0;
    const rawToken = match[0];
    const paramIndex = Number(match[1]);

    if (indexStart > cursor) {
      parts.push(template.slice(cursor, indexStart));
    }

    const paramValue = Number.isNaN(paramIndex) ? null : getParamValue(paramIndex);
    if (paramValue != null && paramValue !== '') {
      parts.push(
        <span key={`resolved-${key++}`} className={highlightClassName}>
          {paramValue}
        </span>
      );
    } else if (keepUnknownPlaceholders) {
      parts.push(
        <span key={`unknown-${key++}`} className={unknownPlaceholderClassName}>
          {rawToken}
        </span>
      );
    }

    cursor = indexStart + rawToken.length;
  }

  if (cursor < template.length) {
    parts.push(template.slice(cursor));
  }

  if (parts.length === 0) return template;
  return <>{parts}</>;
};

export const resolveFetterPieceDescription = (
  pieceEffect: FetterPieceEffect | null | undefined,
  options: ResolveFetterPieceOptions = {}
): FetterPieceDescriptionResult => {
  const description = stripGameMarkup(options.descriptionTemplate ?? pieceEffect?.effectDescription?.en ?? '');
  const addProps = Array.isArray(pieceEffect?.addProp) ? pieceEffect.addProp : [];
  const effectParams = Array.isArray(pieceEffect?.effectDescriptionParam)
    ? pieceEffect.effectDescriptionParam.map((param) => String(param))
    : [];

  const getParamValue = (index: number): string | null => {
    if (index >= 0 && index < effectParams.length) {
      return effectParams[index];
    }
    const prop = addProps[index];
    if (!prop) return null;
    const normalizedValue = prop.isRatio ? prop.value : prop.value / 10;
    return Number.isFinite(normalizedValue) ? formatNumber(normalizedValue) : null;
  };

  const unresolvedCount = [...description.matchAll(PLACEHOLDER_PATTERN)].reduce((count, match) => {
    const index = Number(match[1]);
    return getParamValue(index) == null ? count + 1 : count;
  }, 0);

  return {
    renderedParts: renderTemplateWithHighlights({
      template: description,
      getParamValue,
      keepUnknownPlaceholders: true,
      highlightClassName: 'text-cyan-200 font-semibold',
      unknownPlaceholderClassName: 'text-amber-200/90 font-semibold',
    }),
    unresolvedCount,
  };
};
