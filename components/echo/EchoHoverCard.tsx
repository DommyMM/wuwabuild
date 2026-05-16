'use client';

import React, { ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGameData } from '@/contexts/GameDataContext';
import { Echo } from '@/lib/echo';
import { renderGameTemplateWithHighlights } from '@/lib/text/gameText';
import {
  HoverCard,
  HoverCardIcon,
  HoverCardSection,
  HoverCardDescription,
  HoverCardBonusList,
  HoverCardChipModel,
} from '@/components/ui/HoverCard';

interface EchoHoverCardProps {
  children: ReactNode;
  echo: Echo;
  placement?: 'right' | 'left' | 'top' | 'bottom';
  triggerClassName?: string;
}

const formatBonusValue = (value: number): string => (
  Number.isInteger(value)
    ? String(Math.trunc(value))
    : value.toFixed(1).replace(/(\.\d*?[1-9])0+$/u, '$1').replace(/\.0+$/u, '')
);

export const EchoHoverCard: React.FC<EchoHoverCardProps> = ({
  children,
  echo,
  placement = 'right',
  triggerClassName,
}) => {
  const { t } = useLanguage();
  const { getFetterByElement, statTranslations } = useGameData();

  const echoName = t(echo.nameI18n ?? { en: echo.name });
  const setNames = echo.elements
    .map((element) => getFetterByElement(element))
    .filter((fetter): fetter is NonNullable<ReturnType<typeof getFetterByElement>> => Boolean(fetter))
    .map((fetter) => t(fetter.name));
  const skillTemplate = echo.skill?.description ?? '';
  const levelOneParams = echo.skill?.params?.[0] ?? [];

  const chips: HoverCardChipModel[] = [
    { label: `Cost ${echo.cost}`, tone: 'amber' },
    ...setNames.map((name) => ({ label: name })),
  ];

  const icon = (
    <HoverCardIcon
      src={echo.iconUrl}
      alt={echoName}
      borderClass="border-white/24"
      bgClass="bg-black/45"
    />
  );

  const bonusItems = (echo.bonuses ?? []).map((bonus) => {
    const localizedStatName = statTranslations?.[bonus.stat]
      ? t(statTranslations[bonus.stat])
      : bonus.stat;
    return {
      name: localizedStatName,
      value: formatBonusValue(bonus.value),
      prefix: '+',
    };
  });

  const body = (
    <>
      {bonusItems.length > 0 && <HoverCardBonusList items={bonusItems} />}
      {skillTemplate && (
        <HoverCardSection variant="plain">
          <HoverCardDescription>
            {renderGameTemplateWithHighlights({
              template: skillTemplate,
              getParamValue: (index) => levelOneParams[index] ?? null,
              highlightClassName: 'text-cyan-200 font-semibold',
              keepUnknownPlaceholders: true,
            })}
          </HoverCardDescription>
        </HoverCardSection>
      )}
    </>
  );

  return (
    <HoverCard
      placement={placement}
      triggerClassName={triggerClassName}
      icon={icon}
      title={echoName}
      chips={chips}
      body={body}
    >
      {children}
    </HoverCard>
  );
};
