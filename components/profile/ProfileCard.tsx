'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BuildProvider } from '@/contexts/BuildContext';
import { StatsProvider } from '@/contexts/StatsContext';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { computeTopPercent, getRankTier } from '@/lib/calculations/rankTier';
import { CardArtSourceMode, CardArtTransform, DEFAULT_CARD_ART_TRANSFORM, MAX_ART_ZOOM, MIN_ART_ZOOM } from '@/lib/cardArt';
import { isRover } from '@/lib/character';
import { getBuildStandings, LBBuildDetailEntry, LBBuildRowEntry, LBStandingEntry } from '@/lib/lb';
import { getWeaponPaths } from '@/lib/paths';
import { resolveSplashCardArt } from '@/lib/splashArt';
import { SavedState } from '@/lib/build';
import { parseLBSeqLevel, stripLBSeqPrefix } from '@/components/leaderboards/constants';
import { formatDateLabel } from '@/components/leaderboards/formatters';
import { BuildCard } from '@/components/edit/BuildCard';
import { CardActionBar } from '@/components/card/CardActionBar';
import { RankBoard } from '@/components/card/RankModule';
import { ProfileRankSection } from './ProfileRankSection';
import { SubstatSummaryRow } from './SubstatSummaryRow';
import { AdjustRankingButton, NO_RANKING_KEY } from './AdjustRankingButton';
import posthog from 'posthog-js';

const ACCEPTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MIN_CUSTOM_IMAGE_HEIGHT = 600;
const FIXED_CARD_PREVIEW_WIDTH = 1440;
const EXPORT_CARD_WIDTH = 3840;

interface ProfileCardProps {
  entry: LBBuildRowEntry;
  detail: LBBuildDetailEntry;
  /** Reports the board the expanded bench should analyze. May differ when ranking is hidden. */
  onActiveBoardChange?: (board: RankBoard | null) => void;
}

interface StandingsResult {
  key: string;
  standings: LBStandingEntry[];
}

const buildStandingKey = (s: LBStandingEntry): string => (
  s.key && s.key.length > 0 ? s.key : `${s.weaponId}:${s.trackKey}`
);

const pickDefaultBoard = (boards: RankBoard[], equippedWeaponId?: string): RankBoard | null => {
  if (boards.length === 0) return null;
  const sorted = [...boards].sort((a, b) => a.topPercent - b.topPercent);
  return sorted.find((board) => board.weaponId === equippedWeaponId) ?? sorted[0] ?? null;
};

const getImageNaturalHeight = async (file: File): Promise<number> => {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise<number>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img.naturalHeight || img.height || 0);
      img.onerror = () => reject(new Error('Failed to load image metadata.'));
      img.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const readFileAsDataUrl = (file: File): Promise<string> => (
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  })
);

export const ProfileCard: React.FC<ProfileCardProps> = ({ entry, detail, onActiveBoardChange }) => {
  const { error: toastError } = useToast();
  const { getWeapon, getCharacter } = useGameData();
  const { t } = useLanguage();

  const initialState = useMemo<SavedState>(() => ({
    ...detail.buildState,
    watermark: {
      ...detail.buildState.watermark,
      username: entry.owner.username,
      uid: entry.owner.uid,
    },
  }), [detail.buildState, entry.owner.uid, entry.owner.username]);

  const cardRef = useRef<HTMLDivElement>(null);
  const [artTransform, setArtTransform] = useState<CardArtTransform>(DEFAULT_CARD_ART_TRANSFORM);
  const [artSourceMode, setArtSourceMode] = useState<CardArtSourceMode>('default');
  const [customArtUrl, setCustomArtUrl] = useState<string | null>(null);
  const [isArtEditMode, setIsArtEditMode] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedStandingKey, setSelectedStandingKey] = useState<string | null>(null);

  // Standings fetch lives at the orchestrator level (not inside BuildProvider)
  // because the AdjustRankingButton in the action bar also needs the full board
  // action bar sits outside the BuildProvider subtree if we want toggling rankings to not re-mount the card.
  const [standingsResult, setStandingsResult] = useState<StandingsResult>({ key: '', standings: [] });
  const abortRef = useRef<AbortController | null>(null);

  const characterId = entry.character.id;
  const standingsRequestKey = characterId && entry.id ? `${characterId}:${entry.id}` : '';
  const standings = useMemo(
    () => standingsResult.key === standingsRequestKey ? standingsResult.standings : [],
    [standingsRequestKey, standingsResult.key, standingsResult.standings],
  );
  const standingsLoading = Boolean(standingsRequestKey && standingsResult.key !== standingsRequestKey);
  const characterRef = getCharacter(characterId);
  const characterName = characterRef
    ? t(characterRef.nameI18n ?? { en: characterRef.name })
    : characterId ?? 'build';
  const equippedWeaponId = detail.buildState.weaponId ?? entry.weapon.id ?? undefined;
  const uploadedLabel = formatDateLabel(entry.timestamp);

  useEffect(() => {
    if (!characterId || !entry.id) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestKey = standingsRequestKey;

    getBuildStandings(characterId, entry.id, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setStandingsResult({ key: requestKey, standings: result });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setStandingsResult({ key: requestKey, standings: [] });
      });

    return () => controller.abort();
  }, [characterId, entry.id, standingsRequestKey]);

  // Default the panel art to the character's splash, matching the editor card.
  // Removing the art opts this card out so the banner fallback sticks.
  const splashOptOutRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!characterRef || !characterId) return;
    if (splashOptOutRef.current.has(characterId)) return;
    if (artSourceMode !== 'default' || customArtUrl) return;

    let cancelled = false;
    resolveSplashCardArt(
      String(characterRef.id),
      characterRef.legacyId ?? null,
      isRover(characterRef),
    ).then((splash) => {
      if (cancelled || !splash) return;
      setCustomArtUrl(splash.url);
      setArtSourceMode('splash');
      setArtTransform(splash.transform);
    });

    return () => {
      cancelled = true;
    };
  }, [artSourceMode, characterId, characterRef, customArtUrl]);

  const availableBoards = useMemo<RankBoard[]>(() => {
    return standings
      .filter((s) => s.rank > 0 && s.total > 0)
      .map<RankBoard>((s) => {
        const boardWeapon = getWeapon(s.weaponId);
        const weaponName = boardWeapon
          ? t(boardWeapon.nameI18n ?? { en: boardWeapon.name })
          : s.weaponId;
        const topPercent = computeTopPercent(s.rank, s.total);
        const seqLevel = parseLBSeqLevel(s.trackKey);
        const baseLabel = stripLBSeqPrefix(s.trackLabel || s.trackKey);
        const trackLabel = seqLevel > 0 ? `${baseLabel} S${seqLevel}` : baseLabel;
        return {
          key: buildStandingKey(s),
          rank: s.rank,
          total: s.total,
          topPercent,
          tier: getRankTier(topPercent).letter,
          weaponId: s.weaponId,
          weaponName,
          weaponIcon: boardWeapon ? getWeaponPaths(boardWeapon) : undefined,
          sequence: entry.sequence,
          trackKey: s.trackKey,
          trackLabel,
          damage: s.damage,
        };
      });
  }, [standings, getWeapon, t, entry.sequence]);

  const showOriginalForte = selectedStandingKey === NO_RANKING_KEY;
  const showProfileRankSection = !showOriginalForte && (standingsLoading || availableBoards.length > 0);

  const activeBoard = useMemo<RankBoard | null>(() => {
    if (showOriginalForte) return null;
    if (availableBoards.length === 0) return null;
    if (selectedStandingKey) {
      const match = availableBoards.find((b) => b.key === selectedStandingKey);
      if (match) return match;
    }
    // Default to the equipped weapon's best board so card and bench stay anchored
    // to the build, then fall back to the best placement overall.
    return pickDefaultBoard(availableBoards, equippedWeaponId);
  }, [showOriginalForte, availableBoards, selectedStandingKey, equippedWeaponId]);

  const analysisBoard = useMemo<RankBoard | null>(() => (
    activeBoard ?? pickDefaultBoard(availableBoards, equippedWeaponId)
  ), [activeBoard, availableBoards, equippedWeaponId]);

  // Let the expansion shell mirror the picker for ranked cards. When the user
  // hides ranking for original forte, keep the bench on an equipped/best board.
  useEffect(() => {
    onActiveBoardChange?.(analysisBoard);
  }, [analysisBoard, onActiveBoardChange]);

  const handleToggleArtEditMode = useCallback(() => setIsArtEditMode((v) => !v), []);
  const handleResetArtTransform = useCallback(() => setArtTransform(DEFAULT_CARD_ART_TRANSFORM), []);
  const handleNudge = useCallback((dx: number, dy: number) => {
    setArtTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  }, []);
  const handleZoom = useCallback((delta: number) => {
    setArtTransform((prev) => {
      const next = Number((prev.scale + delta).toFixed(2));
      const clamped = Math.max(MIN_ART_ZOOM, Math.min(MAX_ART_ZOOM, next));
      return { ...prev, scale: clamped };
    });
  }, []);
  const handleRemoveCustomArt = useCallback(() => {
    if (characterId) splashOptOutRef.current.add(characterId);
    setCustomArtUrl(null);
    setArtSourceMode('default');
    setArtTransform(DEFAULT_CARD_ART_TRANSFORM);
  }, [characterId]);

  const handleCustomArtUpload = useCallback(async (file: File) => {
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      toastError('Unsupported file type. Use PNG, JPG, or WEBP.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toastError('Image is too large. Maximum file size is 10MB.');
      return;
    }
    try {
      const [naturalHeight, dataUrl] = await Promise.all([
        getImageNaturalHeight(file),
        readFileAsDataUrl(file),
      ]);
      let autoScale = MIN_ART_ZOOM;
      if (naturalHeight > 0 && naturalHeight < MIN_CUSTOM_IMAGE_HEIGHT) {
        autoScale = Math.min(
          MAX_ART_ZOOM,
          Number((MIN_CUSTOM_IMAGE_HEIGHT / naturalHeight).toFixed(2))
        );
      }
      setCustomArtUrl(dataUrl);
      setArtSourceMode('custom');
      setArtTransform({ x: 0, y: 0, scale: autoScale });
    } catch (error) {
      toastError('Failed to process custom image.');
      console.error('Custom image processing failed:', error);
    }
  }, [toastError]);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current || isDownloading) return;
    setIsDownloading(true);
    setIsArtEditMode(false);

    const { toBlob } = await import('html-to-image');
    const pixelRatio = EXPORT_CARD_WIDTH / FIXED_CARD_PREVIEW_WIDTH;

    try {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const exportBlob = await toBlob(cardRef.current, {
        cacheBust: true,
        pixelRatio,
        style: {
          maxWidth: `${FIXED_CARD_PREVIEW_WIDTH}px`,
          minWidth: `${FIXED_CARD_PREVIEW_WIDTH}px`,
          width: `${FIXED_CARD_PREVIEW_WIDTH}px`,
        },
        width: FIXED_CARD_PREVIEW_WIDTH,
      });
      if (!exportBlob) throw new Error('Card export returned an empty blob.');

      const charSlug = characterName.replace(/\s+/g, '-');
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');

      const url = URL.createObjectURL(exportBlob);
      const link = document.createElement('a');
      link.download = `${charSlug}_${dateStr}_${timeStr}.png`;
      link.href = url;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      posthog.capture('profile_card_download', {
        character_id: characterId,
        character_name: characterName,
        build_id: entry.id,
      });
    } catch (e) {
      posthog.captureException(e);
      toastError('Failed to download build card.');
      console.error('Profile card download failed:', e);
    } finally {
      setIsDownloading(false);
    }
  }, [characterId, characterName, entry.id, isDownloading, toastError]);

  return (
    <BuildProvider initialState={initialState} persistDraft={false}>
      <StatsProvider>
        <div className="flex flex-col gap-3">
          {/* The cardRef wraps both the card AND the substat row so the download
              captures them together (Akasha-style). */}
          <div ref={cardRef} className="flex flex-col gap-3">
            <BuildCard
              useAltSkin={false}
              showCV
              showRollQuality
              artTransform={artTransform}
              artSourceMode={artSourceMode}
              customArtUrl={customArtUrl}
              isArtEditMode={isArtEditMode}
              onCustomArtUpload={handleCustomArtUpload}
              onArtTransformChange={setArtTransform}
              forteSection={showProfileRankSection ? (
                <ProfileRankSection
                  availableBoards={availableBoards}
                  activeBoard={activeBoard}
                  standings={standings}
                  standingsLoading={standingsLoading}
                />
              ) : undefined}
            />
            <SubstatSummaryRow />
          </div>

          <CardActionBar
            className="flex flex-col"
            isArtEditMode={isArtEditMode}
            onToggleArtEditMode={handleToggleArtEditMode}
            isDownloading={isDownloading}
            onDownload={handleDownload}
            artTransform={artTransform}
            artSourceMode={artSourceMode}
            onZoom={handleZoom}
            onNudge={handleNudge}
            onResetArtTransform={handleResetArtTransform}
            onRemoveCustomArt={handleRemoveCustomArt}
            extraActions={
              <>
                <AdjustRankingButton
                  availableBoards={availableBoards}
                  activeBoard={activeBoard}
                  showOriginalForte={showOriginalForte}
                  equippedWeaponId={equippedWeaponId}
                  onSelect={setSelectedStandingKey}
                />
                {uploadedLabel && (
                  <span
                    className="ml-auto font-ropa text-[11px] uppercase tracking-[0.14em] text-text-primary/50"
                    title={`First uploaded ${uploadedLabel}. Re-submitting the same build keeps this date.`}
                  >
                    Uploaded{' '}
                    <time dateTime={entry.timestamp} className="text-text-primary/70">
                      {uploadedLabel}
                    </time>
                  </span>
                )}
              </>
            }
          />
        </div>
      </StatsProvider>
    </BuildProvider>
  );
};
