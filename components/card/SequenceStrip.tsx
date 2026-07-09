'use client';

import React from 'react';
import { HoverCard, HoverCardIcon, HoverCardDescription } from '@/components/ui/HoverCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { CDNChainEntry, I18nString } from '@/lib/character';
import { ELEMENT_COLOR } from '@/lib/elementVisuals';
import { renderGameTemplateWithHighlights } from '@/lib/text/gameText';

interface SequenceStripProps {
  chains: CDNChainEntry[];
  sequence: number;
  element: string;
  characterName?: I18nString;
  /**
   * Overlay variant renders on top of the character art (CharacterPanel), so
   * every node gets a solid dark backing to survive arbitrary custom art.
   */
  overlay?: boolean;
}

export const SequenceStrip: React.FC<SequenceStripProps> = ({
  chains, sequence, element, characterName, overlay = false,
}) => {
  const { t } = useLanguage();
  const color = ELEMENT_COLOR[element] ?? '#ffffff';
  const resolvedCharacterName = characterName ? t(characterName) : 'Resonator';
  const resolveLocalizedText = (value: I18nString | string | undefined): string => {
    if (!value) return '';
    return typeof value === 'string' ? value : t(value);
  };

  return (
    <div
      className={
        overlay
          ? 'flex shrink-0 flex-col items-center gap-1.5'
          : 'flex pt-4 h-full w-11.5 shrink-0 flex-col items-center gap-2 mx-3'
      }
    >
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const chain = chains[i];
        const active = i < sequence;
        const chainName = resolveLocalizedText(chain?.name);
        const chainDescription = resolveLocalizedText(chain?.description);

        const trigger = (
          <div
            className={`relative flex items-center justify-center rounded-full border transition-all duration-300 ${
              overlay ? 'h-10 w-10' : 'h-11.5 w-11.5'
            } ${active ? 'opacity-100' : overlay ? 'opacity-55 grayscale' : 'opacity-40 grayscale'}`}
            style={{
              borderColor: active ? `${color}90` : 'rgba(255,255,255,0.15)',
              backgroundColor: overlay
                ? 'rgba(8,10,14,0.55)'
                : active ? `${color}15` : 'rgba(0,0,0,0.4)',
              boxShadow: active
                ? `0 0 10px ${color}30, inset 0 0 8px ${color}15`
                : overlay ? '0 2px 8px rgba(0,0,0,0.45)' : 'none',
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
        );

        if (!chain) {
          return <React.Fragment key={i}>{trigger}</React.Fragment>;
        }

        const icon = (
          <HoverCardIcon
            src={chain.icon}
            alt={chainName}
            borderClass="border-white/24"
            bgClass="bg-black/45"
            imgClassName="h-3/4 w-3/4 object-contain"
          />
        );

        return (
          <HoverCard
            key={i}
            placement="right"
            maxRisePx={180}
            icon={icon}
            eyebrow={resolvedCharacterName}
            title={chainName}
            chips={[{ label: `Resonance Chain ${i + 1}`, tone: 'amber' }]}
            body={chainDescription ? (
              <HoverCardDescription>
                {renderGameTemplateWithHighlights({
                  template: chainDescription,
                  getParamValue: (index) => chain.param?.[index] ?? null,
                  highlightClassName: 'text-cyan-200 font-semibold',
                  keepUnknownPlaceholders: true,
                  unknownPlaceholderClassName: 'text-amber-200/90 font-semibold',
                })}
              </HoverCardDescription>
            ) : undefined}
          >
            {trigger}
          </HoverCard>
        );
      })}
    </div>
  );
};
