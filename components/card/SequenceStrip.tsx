'use client';

import React from 'react';
import { HoverTooltip } from '@/components/ui/HoverTooltip';
import { useLanguage } from '@/contexts/LanguageContext';
import { CDNChainEntry, I18nString } from '@/lib/character';
import { ELEMENT_COLOR } from '@/lib/elementVisuals';
import { renderGameTemplateWithHighlights } from '@/lib/text/gameText';

interface SequenceStripProps {
  chains: CDNChainEntry[];
  sequence: number;
  element: string;
  characterName?: I18nString;
}

export const SequenceStrip: React.FC<SequenceStripProps> = ({
  chains, sequence, element, characterName,
}) => {
  const { t } = useLanguage();
  const color = ELEMENT_COLOR[element] ?? '#ffffff';
  const resolvedCharacterName = characterName ? t(characterName) : 'Resonator';
  const resolveLocalizedText = (value: I18nString | string | undefined): string => {
    if (!value) return '';
    return typeof value === 'string' ? value : t(value);
  };

  return (
    <div className="flex pt-4 h-full w-11.5 shrink-0 flex-col items-center gap-2 mx-3">
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const chain = chains[i];
        const active = i < sequence;
        const chainName = resolveLocalizedText(chain?.name);
        const chainDescription = resolveLocalizedText(chain?.description);
        const tooltipContent = chain ? (
          <div className="font-plus-jakarta text-white/90">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{resolvedCharacterName}</p>
            <p className="mt-1 text-base font-semibold text-white/96">{chainName}</p>
            <div className="mt-2 inline-flex rounded-md border border-white/15 bg-black/35 px-2 py-1 text-xs font-semibold text-white/86">
              Resonance Chain {i + 1}
            </div>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-white/86">
              {renderGameTemplateWithHighlights({
                template: chainDescription,
                getParamValue: (index) => chain.param?.[index] ?? null,
                highlightClassName: 'text-cyan-200 font-semibold',
                keepUnknownPlaceholders: true,
                unknownPlaceholderClassName: 'text-amber-200/90 font-semibold',
              })}
            </p>
          </div>
        ) : null;

        return (
          <HoverTooltip
            key={i}
            content={tooltipContent}
            disabled={!chain}
            placement="right"
            maxRisePx={180}
          >
            <div
              className={`relative flex h-11.5 w-11.5 items-center justify-center rounded-full border transition-all duration-300 ${
                active ? 'opacity-100' : 'opacity-40 grayscale'
              }`}
              style={{
                borderColor: active ? `${color}90` : 'rgba(255,255,255,0.15)',
                backgroundColor: active ? `${color}15` : 'rgba(0,0,0,0.4)',
                boxShadow: active
                  ? `0 0 10px ${color}30, inset 0 0 8px ${color}15`
                  : 'none',
              }}
            >
              {chain?.icon && (
                <img
                  src={chain.icon}
                  alt={`Sequence ${i + 1}`}
                  className="h-2/3 w-2/3 object-contain transition-all duration-300"
                />
              )}
            </div>
          </HoverTooltip>
        );
      })}
    </div>
  );
};
