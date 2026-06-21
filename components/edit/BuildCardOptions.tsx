'use client';

import React, { useState, useEffect } from 'react';
import { useBuild } from '@/contexts/BuildContext';
import { useSelectedCharacter } from '@/hooks/useSelectedCharacter';
import { hasAlternateSkin } from '@/lib/character';

export interface CardOptions {
  source: string;
  showRollQuality: boolean;
  showCV: boolean;
  useAltSkin: boolean;
}

interface BuildCardOptionsProps {
  onChange: (options: CardOptions) => void;
  onUseSplashArt?: () => void;
  isSplashArtActive?: boolean;
  className?: string;
}

const INPUT_BASE = 'rounded-md border border-border bg-background-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-primary/25 focus:border-accent/60 focus:outline-none';
const LABEL_BASE = 'text-[10px] font-medium uppercase tracking-wider text-text-primary/40';
const CHECKBOX_BOX_BASE = 'flex h-[38px] w-[42px] cursor-pointer items-center justify-center rounded-md border border-border bg-background-secondary transition-colors hover:border-accent/50 has-disabled:cursor-not-allowed has-disabled:opacity-50';
const CHECKBOX_INPUT_BASE = 'h-4 w-4 accent-accent';

export const BuildCardOptions: React.FC<BuildCardOptionsProps> = ({
  onChange,
  onUseSplashArt,
  isSplashArtActive = false,
  className = '',
}) => {
  const { state, setWatermark } = useBuild();
  const selected = useSelectedCharacter();
  const [showRollQuality, setShowRollQuality] = useState(true);
  const [showCV, setShowCV] = useState(true);
  const [useAltSkin, setUseAltSkin] = useState(true);

  const hasSkin = selected ? hasAlternateSkin(selected.character) : false;

  useEffect(() => {
    onChange({ source: state.watermark.artSource, showRollQuality, showCV, useAltSkin });
  }, [state.watermark.artSource, showRollQuality, showCV, useAltSkin, onChange]);

  const handlePaste = (field: 'username' | 'uid', max: number) =>
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text').slice(0, max);
      setWatermark({ [field]: text });
    };

  return (
    <div className={`grid w-full min-w-0 grid-cols-6 items-start gap-3 rounded-lg border border-border bg-background p-3 md:flex md:w-auto md:min-w-fit ${className}`}>
      {/* Name - max 12 chars */}
      <div className="col-span-3 flex min-w-0 flex-col gap-1.5 md:col-auto">
        <label className={LABEL_BASE}>Name</label>
        <input
          type="text"
          value={state.watermark.username}
          onChange={e => setWatermark({ username: e.target.value })}
          onPaste={handlePaste('username', 12)}
          placeholder="Username"
          maxLength={12}
          className={`${INPUT_BASE} w-full md:w-[130px]`}
        />
      </div>

      {/* UID - max 9 chars */}
      <div className="col-span-3 flex min-w-0 flex-col gap-1.5 md:col-auto">
        <label className={LABEL_BASE}>UID</label>
        <input
          type="text"
          value={state.watermark.uid}
          onChange={e => setWatermark({ uid: e.target.value })}
          onPaste={handlePaste('uid', 9)}
          placeholder="123456789"
          maxLength={9}
          className={`${INPUT_BASE} w-full md:w-[110px]`}
        />
      </div>

      {/* Art credit / skin selection */}
      <div className="col-span-4 flex min-w-0 flex-col gap-1.5 md:col-auto">
        <span className={LABEL_BASE}>{hasSkin ? 'Skin' : 'Art Source'}</span>
        {hasSkin ? (
          <div className="grid h-[38px] grid-cols-2 overflow-hidden rounded-md border border-border bg-background-secondary p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setUseAltSkin(false)}
              aria-pressed={!useAltSkin}
              className={`rounded-[4px] px-2 transition-colors ${
                !useAltSkin
                  ? 'bg-accent text-background'
                  : 'text-text-primary/55 hover:text-text-primary/85'
              }`}
            >
              Normal
            </button>
            <button
              type="button"
              onClick={() => setUseAltSkin(true)}
              aria-pressed={useAltSkin}
              className={`rounded-[4px] px-2 transition-colors ${
                useAltSkin
                  ? 'bg-accent text-background'
                  : 'text-text-primary/55 hover:text-text-primary/85'
              }`}
            >
              Skin
            </button>
          </div>
        ) : (
          <input
            type="text"
            value={state.watermark.artSource}
            onChange={e => setWatermark({ artSource: e.target.value })}
            placeholder="art by @artist"
            className={`${INPUT_BASE} w-full md:w-[145px]`}
          />
        )}
      </div>

      {/* Splash Art */}
      <div className="col-span-1 flex min-w-0 flex-col gap-1.5 md:col-auto">
        <span className={LABEL_BASE}>Splash Art</span>
        <label className={CHECKBOX_BOX_BASE}>
          <input
            type="checkbox"
            checked={isSplashArtActive}
            onChange={onUseSplashArt}
            disabled={!selected || !onUseSplashArt}
            className={CHECKBOX_INPUT_BASE}
            aria-label={isSplashArtActive ? 'Use original art' : 'Use splash art'}
          />
        </label>
      </div>

      {/* Roll Quality */}
      <div className="col-span-1 flex min-w-0 flex-col gap-1.5 md:col-auto">
        <span className={LABEL_BASE}>Quality</span>
        <label className={CHECKBOX_BOX_BASE}>
          <input
            type="checkbox"
            checked={showRollQuality}
            onChange={e => setShowRollQuality(e.target.checked)}
            className={CHECKBOX_INPUT_BASE}
            aria-label="Show roll quality"
          />
        </label>
      </div>

      {/* CV */}
      <div className="col-span-1 flex min-w-0 flex-col gap-1.5 md:col-auto">
        <span className={LABEL_BASE}>CV</span>
        <label className={CHECKBOX_BOX_BASE}>
          <input
            type="checkbox"
            checked={showCV}
            onChange={e => setShowCV(e.target.checked)}
            className={CHECKBOX_INPUT_BASE}
            aria-label="Show crit value"
          />
        </label>
      </div>
    </div>
  );
};
