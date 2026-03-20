import React, { ReactNode } from 'react';
import { CDNFetter } from '@/lib/echo';

const PLACEHOLDER_PATTERN = /\{(\d+)\}/g;
const MARKUP_TAG_PATTERN = /<\/?[a-zA-Z][^>]*>|<br\s*\/?>/giu;
const OPEN_COLOR_PATTERN = /^<color=([^>]+)>$/iu;
const CLOSE_COLOR_PATTERN = /^<\/color>$/iu;
const OPEN_SIZE_PATTERN = /^<size=([^>]+)>$/iu;
const CLOSE_SIZE_PATTERN = /^<\/size>$/iu;
const OPEN_TEXT_ENTRY_PATTERN = /^<te\b[^>]*>$/iu;
const CLOSE_TEXT_ENTRY_PATTERN = /^<\/te>$/iu;

const GAME_COLOR_STYLES: Record<string, React.CSSProperties> = {
  Highlight: { color: '#f8e39a' },
  Title: { color: '#ffffff' },
  Wind: { color: '#7df3c0' },
  Thunder: { color: '#caa7ff' },
  Fire: { color: '#ff9a72' },
  Ice: { color: '#9edcff' },
  Light: { color: '#ffe394' },
  Dark: { color: '#f08ad2' },
};

interface MarkupState {
  colorName?: string;
  sizePx?: number;
}

interface TextSegment {
  text: string;
  state: MarkupState;
}

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
interface ResolveTemplateFromValuesOptions {
  template: string;
  values: Array<string | null | undefined>;
  keepUnknownPlaceholders?: boolean;
  highlightClassName?: string;
  unknownPlaceholderClassName?: string;
}

type RenderGameTemplateWithHighlightsArgs = RenderTemplateWithHighlightsArgs;

const formatNumber = (value: number): string => {
  const rounded = Math.round(value * 10000) / 10000;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded).replace(/(\.\d*?[1-9])0+$/u, '$1').replace(/\.0+$/u, '');
};

export const stripGameMarkup = (input: string): string => {
  if (!input) return '';

  return input
    .replace(/\{(?!\d+\})[^{}]+\}/gu, '')
    .replace(/<br\s*\/?>/giu, '\n')
    .replace(/<\/?[^>]+>/gu, '')
    .replace(/\r\n/gu, '\n')
    .replace(/[ \t]+\n/gu, '\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim();
};

const cloneState = (state: MarkupState): MarkupState => ({ ...state });

const getGameTextStyle = (state: MarkupState): React.CSSProperties | undefined => {
  const style: React.CSSProperties = {};
  if (state.colorName) {
    Object.assign(style, GAME_COLOR_STYLES[state.colorName] ?? { color: state.colorName });
  }
  if (typeof state.sizePx === 'number' && Number.isFinite(state.sizePx)) {
    style.fontSize = `${state.sizePx}px`;
    if (state.sizePx >= 32) {
      style.fontWeight = 700;
      style.lineHeight = 1.25;
      style.display = 'inline-block';
    }
  }
  return Object.keys(style).length > 0 ? style : undefined;
};

const parseGameMarkupSegments = (input: string): TextSegment[] => {
  if (!input) return [];

  const segments: TextSegment[] = [];
  const state: MarkupState = {};
  const colorStack: Array<string | undefined> = [];
  const sizeStack: Array<number | undefined> = [];
  let cursor = 0;

  const pushText = (text: string) => {
    if (!text) return;
    segments.push({ text, state: cloneState(state) });
  };

  for (const match of input.matchAll(MARKUP_TAG_PATTERN)) {
    const index = match.index ?? 0;
    const rawTag = match[0];

    if (index > cursor) {
      pushText(input.slice(cursor, index));
    }

    if (/^<br\s*\/?>$/iu.test(rawTag)) {
      pushText('\n');
    } else {
      const openColor = rawTag.match(OPEN_COLOR_PATTERN);
      const openSize = rawTag.match(OPEN_SIZE_PATTERN);

      if (openColor) {
        colorStack.push(state.colorName);
        state.colorName = openColor[1];
      } else if (CLOSE_COLOR_PATTERN.test(rawTag)) {
        state.colorName = colorStack.pop();
      } else if (openSize) {
        sizeStack.push(state.sizePx);
        const parsedSize = Number(openSize[1]);
        state.sizePx = Number.isFinite(parsedSize) ? parsedSize : state.sizePx;
      } else if (CLOSE_SIZE_PATTERN.test(rawTag)) {
        state.sizePx = sizeStack.pop();
      } else if (OPEN_TEXT_ENTRY_PATTERN.test(rawTag) || CLOSE_TEXT_ENTRY_PATTERN.test(rawTag)) {
        // Drop game glossary link wrappers but keep their contents.
      }
    }

    cursor = index + rawTag.length;
  }

  if (cursor < input.length) {
    pushText(input.slice(cursor));
  }

  return segments;
};

const renderTextSegmentWithHighlights = (
  segment: TextSegment,
  getParamValue: (index: number) => string | null,
  options: Pick<RenderTemplateWithHighlightsArgs, 'highlightClassName' | 'keepUnknownPlaceholders' | 'unknownPlaceholderClassName'>,
  keyPrefix: string
): ReactNode[] => {
  const style = getGameTextStyle(segment.state);
  const renderChunk = (content: ReactNode, key: string): ReactNode => (
    style ? <span key={key} style={style}>{content}</span> : <React.Fragment key={key}>{content}</React.Fragment>
  );

  const parts: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const match of segment.text.matchAll(PLACEHOLDER_PATTERN)) {
    const indexStart = match.index ?? 0;
    const rawToken = match[0];
    const paramIndex = Number(match[1]);

    if (indexStart > cursor) {
      parts.push(renderChunk(segment.text.slice(cursor, indexStart), `${keyPrefix}-text-${key++}`));
    }

    const paramValue = Number.isNaN(paramIndex) ? null : getParamValue(paramIndex);
    if (paramValue != null && paramValue !== '') {
      parts.push(renderChunk(
        <span className={options.highlightClassName}>{paramValue}</span>,
        `${keyPrefix}-resolved-${key++}`,
      ));
    } else if (options.keepUnknownPlaceholders) {
      parts.push(renderChunk(
        <span className={options.unknownPlaceholderClassName}>{rawToken}</span>,
        `${keyPrefix}-unknown-${key++}`,
      ));
    }

    cursor = indexStart + rawToken.length;
  }

  if (cursor < segment.text.length) {
    parts.push(renderChunk(segment.text.slice(cursor), `${keyPrefix}-tail-${key++}`));
  }

  if (parts.length === 0) {
    parts.push(renderChunk(segment.text, `${keyPrefix}-full`));
  }

  return parts;
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

export const renderGameTemplateWithHighlights = ({
  template,
  getParamValue,
  highlightClassName = 'text-cyan-200 font-semibold',
  keepUnknownPlaceholders = true,
  unknownPlaceholderClassName = 'text-amber-200/90 font-semibold',
}: RenderGameTemplateWithHighlightsArgs): ReactNode => {
  if (!template) return null;

  const segments = parseGameMarkupSegments(
    template.replace(/\r\n/gu, '\n').replace(/\{(?!\d+\})[^{}]+\}/gu, ''),
  );
  if (segments.length === 0) return null;

  return (
    <>
      {segments.flatMap((segment, index) => renderTextSegmentWithHighlights(
        segment,
        getParamValue,
        {
          highlightClassName,
          keepUnknownPlaceholders,
          unknownPlaceholderClassName,
        },
        `segment-${index}`,
      ))}
    </>
  );
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

export const resolveTemplateFromValues = ({
  template,
  values,
  keepUnknownPlaceholders = true,
  highlightClassName = 'text-cyan-200 font-semibold',
  unknownPlaceholderClassName = 'text-amber-200/90 font-semibold',
}: ResolveTemplateFromValuesOptions): ReactNode => renderTemplateWithHighlights({
  template,
  getParamValue: (index) => {
    if (index < 0 || index >= values.length) return null;
    const value = values[index];
    if (value == null) return null;
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
  },
  keepUnknownPlaceholders,
  highlightClassName,
  unknownPlaceholderClassName,
});

export const resolveGameTemplateFromValues = ({
  template,
  values,
  keepUnknownPlaceholders = true,
  highlightClassName = 'text-cyan-200 font-semibold',
  unknownPlaceholderClassName = 'text-amber-200/90 font-semibold',
}: ResolveTemplateFromValuesOptions): ReactNode => renderGameTemplateWithHighlights({
  template,
  getParamValue: (index) => {
    if (index < 0 || index >= values.length) return null;
    const value = values[index];
    if (value == null) return null;
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
  },
  keepUnknownPlaceholders,
  highlightClassName,
  unknownPlaceholderClassName,
});
