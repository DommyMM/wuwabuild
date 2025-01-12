import React from 'react';
import '../../styles/Build.css';
import { SKIN_CHARACTERS } from '../../types/character';

interface OptionsProps {
  watermark: {
    username: string;
    uid: string;
  };
  showRollQuality: boolean;
  useAltSkin: boolean;
  onWatermarkChange: (watermark: { username: string; uid: string }) => void;
  onRollQualityChange: (checked: boolean) => void;
  onSkinChange: (checked: boolean) => void;
  className?: string;
  characterName?: string;
  artSource: string;
  onArtSourceChange: (source: string) => void;
}

export const Options: React.FC<OptionsProps> = ({
  watermark,
  showRollQuality,
  useAltSkin,
  onWatermarkChange,
  onRollQualityChange,
  onSkinChange,
  className,
  characterName,
  artSource,
  onArtSourceChange
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    onWatermarkChange({
      ...watermark,
      [id.replace('build-', '')]: value
    });
  };

  const handlePaste = (field: 'username' | 'uid') => (e: React.ClipboardEvent) => {
    e.preventDefault();
    const maxLength = field === 'username' ? 12 : 9;
    const pastedText = e.clipboardData.getData('text').slice(0, maxLength);
    onWatermarkChange({
      ...watermark,
      [field]: pastedText
    });
  };

  return (
    <div className={`options-container ${className || ''}`}>
      <div className="input-container">
        <input id="build-username"
          type="text"
          placeholder="Username"
          maxLength={12}
          value={watermark.username}
          onChange={handleInputChange}
          onPaste={handlePaste('username')}
          className="username-input"
        />
        <input id="build-uid"
          type="text"
          placeholder="UID"
          maxLength={9}
          value={watermark.uid}
          onChange={handleInputChange}
          onPaste={handlePaste('uid')}
          className="uid-input"
        />
        <div className="checkbox-container">
          {characterName && SKIN_CHARACTERS.includes(characterName) ? (
            <>
              <input type="checkbox"
                id="alt-skin"
                className="roll-checkbox"
                checked={useAltSkin}
                onChange={(e) => onSkinChange(e.target.checked)}
              />
              <label htmlFor="alt-skin" className="roll-label">
                Use Skin
              </label>
            </>
          ) : (
            <>
              <input type="text"
                id="art-source"
                placeholder="Art Source"
                value={artSource}
                onChange={(e) => onArtSourceChange(e.target.value)}
                className="art-input"
              />
            </>
          )}
        </div>
        <div className="checkbox-container">
          <input type="checkbox"
            id="roll-value"
            className="roll-checkbox"
            checked={showRollQuality}
            onChange={(e) => onRollQualityChange(e.target.checked)}
          />
          <label htmlFor="roll-value" className="roll-label">
            Roll Quality
          </label>
        </div>
      </div>
    </div>
  );
};