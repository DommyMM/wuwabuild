import React from 'react';
import '../../styles/Build.css';

interface OptionsProps {
  watermark: {
    username: string;
    uid: string;
  };
  showRollQuality: boolean;
  onWatermarkChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRollQualityChange: (checked: boolean) => void;
}

export const Options: React.FC<OptionsProps> = ({
  watermark,
  showRollQuality,
  onWatermarkChange,
  onRollQualityChange
}) => {
  return (
    <div className="options-container">
      <div className="input-container">
        <input
          id="build-username"
          type="text"
          placeholder="Username"
          maxLength={12}
          value={watermark.username}
          onChange={onWatermarkChange}
          className="build-input username-input"
        />
        <input
          id="build-uid"
          type="text"
          placeholder="UID"
          maxLength={9}
          value={watermark.uid}
          onChange={onWatermarkChange}
          className="build-input uid-input"
        />
        <div className="checkbox-container">
          <input
            type="checkbox"
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