'use client';

import React from 'react';
import Link from 'next/link';
import { HoverTooltip } from '@/components/ui/HoverTooltip';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getSetBonusesFromPieceEffect } from '@/lib/constants/setBonuses';
import { LBTeamMemberConfig } from '@/lib/lb';
import { getEchoPaths, getWeaponPaths } from '@/lib/paths';
import { renderGameTemplateWithHighlights, resolveFetterPieceDescription } from '@/lib/text/gameText';
import { LB_SEQ_BADGE_COLORS, parseLBSeqLevel, stripLBSeqPrefix } from './leaderboardConstants';

interface LeaderboardHeaderProps {
  characterName: string;
  characterHead?: string;
  characterElement?: string;
  teamCharacterIds?: string[];
  teamMembers?: LBTeamMemberConfig[];
  activeWeaponId?: string;
  activeTrackKey?: string;
  activeTrackLabel?: string;
}

interface LoadoutIcon {
  key: string;
  src: string;
  label: string;
  tooltip: React.ReactNode;
}

const formatValue = (value: number): string => (
  Number.isInteger(value)
    ? String(Math.trunc(value))
    : value.toFixed(1).replace(/(\.\d*?[1-9])0+$/u, '$1').replace(/\.0+$/u, '')
);

export const LeaderboardHeader: React.FC<LeaderboardHeaderProps> = ({
  characterName,
  characterHead,
  characterElement,
  teamCharacterIds = [],
  teamMembers = [],
  activeWeaponId,
  activeTrackKey,
  activeTrackLabel,
}) => {
  const {
    fetters,
    getCharacter,
    getEcho,
    getFetterByElement,
    getWeapon,
    statTranslations,
  } = useGameData();
  const { t } = useLanguage();

  const seqLevel = activeTrackKey ? parseLBSeqLevel(activeTrackKey) : 0;
  const cleanTrackLabel = activeTrackLabel ? stripLBSeqPrefix(activeTrackLabel) : null;
  const elementClass = characterElement ? characterElement.toLowerCase() : '';
  const activeWeapon = getWeapon(activeWeaponId ?? null);
  const activeWeaponIcon = activeWeapon ? getWeaponPaths(activeWeapon) : null;
  const activeWeaponName = activeWeapon ? t(activeWeapon.nameI18n ?? { en: activeWeapon.name }) : null;

  const renderWeaponTooltip = React.useCallback((weaponId?: string, refinement?: number): React.ReactNode => {
    const weapon = getWeapon(weaponId ?? null);
    if (!weapon) return null;

    const weaponName = t(weapon.nameI18n ?? { en: weapon.name });
    const passiveName = t(weapon.effectName ?? { en: '' });
    const rank = refinement && refinement > 0 ? refinement : null;
    const rankIndex = Math.max(0, Math.min(4, (rank ?? 1) - 1));

    return (
      <div className="font-plus-jakarta text-white/90">
        <div className="flex items-center gap-2">
          {weapon.iconUrl ? <img src={weapon.iconUrl} alt="" className="h-10 w-10 object-contain" /> : null}
          <div className="min-w-0">
            <p className="text-base font-semibold text-white/96">{weaponName}</p>
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-white/65">
              {weapon.type} · {weapon.rarity}
            </p>
          </div>
        </div>

        {passiveName ? (
          <p className="mt-2 text-sm font-semibold text-white/95">
            {passiveName}
            {rank ? <span className="text-white/68"> R{rank}</span> : null}
          </p>
        ) : null}

        {weapon.effect?.en ? (
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-white/86">
            {renderGameTemplateWithHighlights({
              template: t(weapon.effect),
              getParamValue: (paramIndex) => {
                const slotValues = weapon.params?.[String(paramIndex)];
                if (!slotValues?.length) return null;
                return slotValues[Math.min(rankIndex, slotValues.length - 1)] ?? null;
              },
              highlightClassName: 'text-cyan-200 font-semibold',
              keepUnknownPlaceholders: true,
            })}
          </p>
        ) : null}
      </div>
    );
  }, [getWeapon, t]);

  const renderFetterTooltip = React.useCallback((setId?: string): React.ReactNode => {
    const fetter = fetters.find((entry) => String(entry.id) === setId);
    if (!fetter) return null;

    const pieceEffects = fetter.pieceEffects ?? {};
    const pieces = Object.entries(pieceEffects)
      .map(([pieceCount, effect]) => ({ pieceCount: Number(pieceCount), effect }))
      .filter((entry) => Number.isFinite(entry.pieceCount) && entry.effect)
      .sort((a, b) => a.pieceCount - b.pieceCount);

    const resolvedPieces = pieces.length > 0
      ? pieces
      : [{
        pieceCount: fetter.pieceCount,
        effect: {
          pieceCount: fetter.pieceCount,
          fetterId: fetter.fetterId,
          addProp: fetter.addProp,
          buffIds: fetter.buffIds,
          effectDescription: fetter.effectDescription,
          effectDescriptionParam: fetter.effectDescriptionParam,
        },
      }];

    return (
      <div className="font-plus-jakarta text-white/90">
        <div className="flex items-center gap-2">
          {fetter.icon ? <img src={fetter.icon} alt="" className="h-8 w-8 object-contain" /> : null}
          <div className="min-w-0">
            <p className="text-base font-semibold text-white/96">{t(fetter.name)}</p>
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-white/65">Sonata Effect</p>
          </div>
        </div>

        <div className="mt-2 space-y-2">
          {resolvedPieces.map(({ pieceCount, effect }) => {
            const pieceBonuses = getSetBonusesFromPieceEffect(effect);
            const renderBonuses = pieceBonuses.length > 0 && (effect.buffIds?.length ?? 0) === 0;
            const { renderedParts } = resolveFetterPieceDescription(effect, {
              descriptionTemplate: t(effect.effectDescription),
            });

            return (
              <div key={`${fetter.id}-${pieceCount}`} className="rounded-lg border border-white/12 bg-black/25 px-2.5 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
                  {pieceCount}-Piece
                </p>
                {renderBonuses ? (
                  <div className="mt-1 space-y-1">
                    {pieceBonuses.map((bonus, index) => {
                      const localizedStatName = statTranslations?.[bonus.stat]
                        ? t(statTranslations[bonus.stat])
                        : bonus.stat;
                      return (
                        <p key={`${fetter.id}-${pieceCount}-${bonus.stat}-${index}`} className="text-sm leading-relaxed text-white/86">
                          <span>{localizedStatName}</span>{' '}
                          <span className="text-cyan-200 font-semibold">+{formatValue(bonus.value)}</span>
                        </p>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-white/86">
                    {renderedParts}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }, [fetters, statTranslations, t]);

  const renderEchoTooltip = React.useCallback((echoId?: string): React.ReactNode => {
    const echo = getEcho(echoId ?? null);
    if (!echo) return null;

    const echoName = t(echo.nameI18n ?? { en: echo.name });
    const setNames = echo.elements
      .map((element) => getFetterByElement(element))
      .filter((fetter): fetter is NonNullable<typeof fetters[number]> => Boolean(fetter))
      .map((fetter) => t(fetter.name));
    const skillTemplate = echo.skill?.description ?? '';
    const levelOneParams = echo.skill?.params?.[0] ?? [];

    return (
      <div className="font-plus-jakarta text-white/90">
        <div className="flex items-center gap-2">
          <img src={getEchoPaths(echo)} alt="" className="h-10 w-10 object-contain" />
          <div className="min-w-0">
            <p className="text-base font-semibold text-white/96">{echoName}</p>
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-white/65">
              Cost {echo.cost}
            </p>
          </div>
        </div>

        {setNames.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {setNames.map((name) => (
              <span key={`${echo.id}-${name}`} className="rounded-md border border-white/15 bg-black/35 px-2 py-0.5 text-xs font-semibold text-white/84">
                {name}
              </span>
            ))}
          </div>
        ) : null}

        {echo.bonuses?.length ? (
          <div className="mt-2 space-y-1">
            {echo.bonuses.map((bonus, index) => {
              const localizedStatName = statTranslations?.[bonus.stat]
                ? t(statTranslations[bonus.stat])
                : bonus.stat;
              return (
                <p key={`${echo.id}-${bonus.stat}-${index}`} className="text-sm leading-relaxed text-white/86">
                  <span>{localizedStatName}</span>{' '}
                  <span className="text-cyan-200 font-semibold">+{formatValue(bonus.value)}</span>
                </p>
              );
            })}
          </div>
        ) : null}

        {skillTemplate ? (
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-white/86">
            {renderGameTemplateWithHighlights({
              template: skillTemplate,
              getParamValue: (index) => levelOneParams[index] ?? null,
              highlightClassName: 'text-cyan-200 font-semibold',
              keepUnknownPlaceholders: true,
            })}
          </p>
        ) : null}
      </div>
    );
  }, [getEcho, getFetterByElement, statTranslations, t]);

  const supportConfigs: LBTeamMemberConfig[] = teamMembers.length > 0
    ? teamMembers
    : teamCharacterIds.map((charId) => ({ charId }));

  const supportMembers = supportConfigs.map((member) => {
    const character = getCharacter(member.charId);
    const weapon = getWeapon(member.weaponId ?? null);
    const echo = getEcho(member.echoId ?? null);
    const set = fetters.find((entry) => String(entry.id) === member.setId);

    const loadoutIcons: LoadoutIcon[] = [
      weapon ? {
        key: 'weapon',
        src: getWeaponPaths(weapon),
        label: t(weapon.nameI18n ?? { en: weapon.name }),
        tooltip: renderWeaponTooltip(member.weaponId, member.refinement),
      } : null,
      echo ? {
        key: 'echo',
        src: getEchoPaths(echo),
        label: t(echo.nameI18n ?? { en: echo.name }),
        tooltip: renderEchoTooltip(member.echoId),
      } : null,
      set?.icon ? {
        key: 'set',
        src: set.icon,
        label: t(set.name),
        tooltip: renderFetterTooltip(member.setId),
      } : null,
    ].filter((icon): icon is LoadoutIcon => icon !== null);

    return {
      id: member.charId,
      head: character?.head,
      name: character ? t(character.nameI18n ?? { en: character.name }) : member.charId,
      loadoutIcons,
    };
  });

  const leadLoadoutIcons: LoadoutIcon[] = activeWeapon && activeWeaponIcon
    ? [{
      key: 'weapon',
      src: activeWeaponIcon,
      label: activeWeaponName ?? 'Weapon',
      tooltip: renderWeaponTooltip(activeWeaponId),
    }]
    : [];

  return (
    <div className="py-3">
      <div className="flex items-center gap-1.5 text-xs text-text-primary/40">
        <Link href="/leaderboards" className="transition-colors hover:text-accent">
          Leaderboards
        </Link>
        <span>/</span>
        <span className="text-text-primary/60">{characterName}</span>
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <h1 className={`text-center text-3xl font-semibold tracking-wide md:text-4xl ${elementClass ? `char-sig ${elementClass}` : 'text-accent'}`}>
              {cleanTrackLabel ? `${characterName} - ${cleanTrackLabel}` : characterName}
            </h1>
            {seqLevel > 0 && (
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold leading-none tracking-wide ${LB_SEQ_BADGE_COLORS[seqLevel]}`}>
                S{seqLevel}
              </span>
            )}
          </div>
        </div>

        <div className="mt-5 flex w-full max-w-5xl flex-wrap items-start justify-center gap-8 md:gap-10">
          <div className="flex flex-col items-center">
            <div className="h-25 w-25 rounded-3xl border border-white/12 bg-black/16 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
              {characterHead ? (
                <div
                  role="img"
                  aria-label={characterName}
                  className="h-full w-full rounded-[inherit] bg-cover bg-center bg-no-repeat"
                  style={{ backgroundImage: `url("${characterHead}")` }}
                />
              ) : (
                <div className="h-full w-full rounded-[inherit] bg-background-secondary/80" />
              )}
            </div>
            {leadLoadoutIcons.length > 0 ? (
              <div className="-mt-3 flex min-h-12 items-center justify-center rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(34,36,42,0.84),rgba(16,18,24,0.72))] px-4 shadow-[0_10px_24px_rgba(0,0,0,0.28)] backdrop-blur-md">
                {leadLoadoutIcons.map((icon) => (
                  <HoverTooltip
                    key={`lead-${icon.key}`}
                    content={icon.tooltip}
                    disabled={!icon.tooltip}
                    placement="bottom"
                    strictPlacement
                  >
                    <img
                      src={icon.src}
                      alt={icon.label}
                      className="h-10 w-10 object-contain"
                    />
                  </HoverTooltip>
                ))}
              </div>
            ) : null}
          </div>

          {supportMembers.map((member) => {
            const visibleLoadoutIcons = member.loadoutIcons;
            const badgeColsClass = visibleLoadoutIcons.length >= 3
              ? 'grid-cols-3 min-w-[8.5rem]'
              : visibleLoadoutIcons.length === 2
                ? 'grid-cols-2 min-w-[5.75rem]'
                : 'grid-cols-1 min-w-[3.9rem]';

            return (
              <div key={member.id} className="flex flex-col items-center">
                <div className="h-25 w-25 rounded-3xl border border-white/12 bg-black/16 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
                  {member.head ? (
                    <div
                      role="img"
                      aria-label={member.name}
                      className="h-full w-full rounded-[inherit] bg-cover bg-center bg-no-repeat"
                      style={{ backgroundImage: `url("${member.head}")` }}
                    />
                  ) : (
                    <div className="h-full w-full rounded-[inherit] bg-background-secondary/80" />
                  )}
                </div>
                {visibleLoadoutIcons.length > 0 ? (
                  <div className={`-mt-3 grid min-h-12 items-center gap-1.5 overflow-hidden rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(32,34,40,0.82),rgba(14,16,22,0.7))] p-0.5 shadow-[0_10px_24px_rgba(0,0,0,0.28)] backdrop-blur-md ${badgeColsClass}`}>
                    {visibleLoadoutIcons.map((icon) => (
                      <HoverTooltip
                        key={`${member.id}-${icon.key}`}
                        content={icon.tooltip}
                        disabled={!icon.tooltip}
                        placement="bottom"
                        strictPlacement
                      >
                        <img
                          src={icon.src}
                          alt={icon.label}
                          className="h-10 w-10 object-contain"
                        />
                      </HoverTooltip>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
