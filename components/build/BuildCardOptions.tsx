'use client';

import React, { useState, useEffect } from 'react';
import { useBuild } from '@/contexts/BuildContext';
import { useSelectedCharacter } from '@/hooks/useSelectedCharacter';
import { SKIN_CHARACTERS } from '@/lib/character';

export interface CardOptions {
  source: string;
  showRollQuality: boolean;
  showCV: boolean;
  useAltSkin: boolean;
}

interface BuildCardOptionsProps {
  onChange: (options: CardOptions) => void;
  className?: string;
}

const INPUT_BASE = 'rounded-md border border-border bg-background-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-primary/25 focus:border-accent/60 focus:outline-none';
const LABEL_BASE = 'text-[10px] font-medium uppercase tracking-wider text-text-primary/40';

export const BuildCardOptions: React.FC<BuildCardOptionsProps> = ({ onChange, className = '' }) => {
  const { state, setWatermark } = useBuild();
  const selected = useSelectedCharacter();
  const [source, setSource] = useState('');
  const [showRollQuality, setShowRollQuality] = useState(true);
  const [showCV, setShowCV] = useState(true);
  const [useAltSkin, setUseAltSkin] = useState(false);

  const hasSkin = selected ? SKIN_CHARACTERS.includes(selected.character.name) : false;

  useEffect(() => {
    onChange({ source, showRollQuality, showCV, useAltSkin });
  }, [source, showRollQuality, showCV, useAltSkin, onChange]);

  const handlePaste = (field: 'username' | 'uid', max: number) =>
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text').slice(0, max);
      setWatermark({ [field]: text });
    };

  return (
    <div className={`flex items-start gap-3 rounded-lg border border-border bg-background p-3 ${className}`}>
      {/* Name — max 12 chars */}
      <div className="flex flex-col gap-1.5">
        <label className={LABEL_BASE}>Name</label>
        <input
          type="text"
          value={state.watermark.username}
          onChange={e => setWatermark({ username: e.target.value })}
          onPaste={handlePaste('username', 12)}
          placeholder="Username"
          maxLength={12}
          className={`${INPUT_BASE} w-[130px]`}
        />
      </div>

      {/* UID — max 9 chars */}
      <div className="flex flex-col gap-1.5">
        <label className={LABEL_BASE}>UID</label>
        <input
          type="text"
          value={state.watermark.uid}
          onChange={e => setWatermark({ uid: e.target.value })}
          onPaste={handlePaste('uid', 9)}
          placeholder="123456789"
          maxLength={9}
          className={`${INPUT_BASE} w-[110px]`}
        />
      </div>

      {/* Art source OR Use Skin */}
      <div className="flex flex-col gap-1.5">
        {hasSkin ? (
          <>
            <span className={LABEL_BASE}>Skin</span>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background-secondary px-3 py-2">
              <input
                type="checkbox"
                checked={useAltSkin}
                onChange={e => setUseAltSkin(e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              <span className="select-none text-sm text-text-primary/60">Use Skin</span>
            </label>
          </>
        ) : (
          <>
            <label className={LABEL_BASE}>Art Source</label>
            <input
              type="text"
              value={source}
              onChange={e => setSource(e.target.value)}
              placeholder="art by @artist"
              className={`${INPUT_BASE} w-[160px]`}
            />
          </>
        )}
      </div>

      {/* Roll Quality */}
      <div className="flex flex-col gap-1.5">
        <span className={LABEL_BASE}>Quality</span>
        <label className="flex cursor-pointer items-center rounded-md border border-border bg-background-secondary px-3 py-2">
          <input
            type="checkbox"
            checked={showRollQuality}
            onChange={e => setShowRollQuality(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
        </label>
      </div>

      {/* CV */}
      <div className="flex flex-col gap-1.5">
        <span className={LABEL_BASE}>CV</span>
        <label className="flex cursor-pointer items-center rounded-md border border-border bg-background-secondary px-3 py-2">
          <input
            type="checkbox"
            checked={showCV}
            onChange={e => setShowCV(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
        </label>
      </div>
    </div>
  );
};

export default BuildCardOptions;
