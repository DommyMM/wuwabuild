import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Character } from '../types/character';
import { Weapon } from '../types/weapon';
import { useWeapons } from '../hooks/useWeapons';
import { useModalClose } from '../hooks/useModalClose';
import { WeaponSlider } from './WeaponSlider';
import '../styles/WeaponSelection.css';
import '../styles/modal.css';
import '../styles/WeaponSlider.css';

interface WeaponSelectionProps {
  selectedCharacter: Character;
  selectedWeapon: Weapon | null;
  onWeaponSelect: (weapon: Weapon) => void;
  weaponConfig: {
    level: number;
    rank: number;
  };
  onWeaponConfigChange: (level: number, rank: number) => void;
  ocrData?: {
    type: 'Weapon';
    name: string;
    weaponType: string;
    weaponLevel: number;
    rank: number;
  };
  preloadedWeapons?: Weapon[];
}

export const WeaponSelection: React.FC<WeaponSelectionProps> = ({
  selectedCharacter,
  selectedWeapon,
  onWeaponSelect,
  weaponConfig,
  onWeaponConfigChange,
  ocrData,
  preloadedWeapons
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastOcrWeapon, setLastOcrWeapon] = useState<string | undefined>();

  useEffect(() => {
    setLastOcrWeapon(undefined);
  }, [selectedCharacter.name]);

  const { weapons, loading, error } = useWeapons({
    weaponType: selectedCharacter.weaponType,
    config: weaponConfig,
    preloadedWeapons: preloadedWeapons
  });

  if (ocrData?.name && ocrData.name !== lastOcrWeapon && weapons.length > 0) {
    const matchedWeapon = weapons.find(
      weapon => weapon.name.toLowerCase() === ocrData.name.toLowerCase()
    );
    if (matchedWeapon) {
      setLastOcrWeapon(ocrData.name);
      onWeaponSelect(matchedWeapon);
      onWeaponConfigChange(ocrData.weaponLevel, ocrData.rank);
    }
  }

  useModalClose(isModalOpen, () => setIsModalOpen(false));

  const rarityOrder = useMemo(() => 
    ["5-star", "4-star", "3-star", "2-star", "1-star"], 
  []); 

  const sortedWeapons = useMemo(() => 
    [...weapons].sort((a, b) => 
      rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity)
    ), 
  [weapons, rarityOrder]);

  const handleLevelChange = useCallback((level: number) => {
    onWeaponConfigChange(level, weaponConfig.rank);
  }, [weaponConfig.rank, onWeaponConfigChange]);

  const handleRankChange = useCallback((rank: number) => {
    onWeaponConfigChange(weaponConfig.level, rank);
  }, [weaponConfig.level, onWeaponConfigChange]);

  return (
    <>
      <div className="weapon-selection">
        <div className="weapon-choice">Weapon</div>
        <div className="weapon-box" id="selectWeapon" onClick={() => setIsModalOpen(true)}>
          <img
            id="weaponImg"
            src={selectedWeapon 
              ? `images/Weapons/${selectedCharacter.weaponType}/${encodeURIComponent(selectedWeapon.name)}.png`
              : 'images/Resources/Weapon.png'
            }
            alt={selectedWeapon?.name || 'Select Weapon'}
            className="select-img"
            style={selectedWeapon ? { 
              backgroundColor: rarityColors[selectedWeapon.rarity],
              border: '2px solid #999'
            } : {}}
          />
          {selectedWeapon && (
            <p id="selectedWeaponLabel" style={{ marginTop: '5px' }}>
              <span className={`weapon-sig rarity-${selectedWeapon.rarity.charAt(0)}`}>
                {selectedWeapon.name}
              </span>
            </p>
          )}
        </div>
        {selectedWeapon && (
          <WeaponSlider 
            level={weaponConfig.level}
            rank={weaponConfig.rank}
            onLevelChange={handleLevelChange}
            onRankChange={handleRankChange}
          />
        )}
      </div>

      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={() => setIsModalOpen(false)}>&times;</span>
            <div className="weapon-list">
              {loading && <div className="loading">Loading weapons...</div>}
              {error && <div className="error">{error}</div>}
              {selectedCharacter && sortedWeapons.map(weapon => (
                <div
                  key={weapon.name}
                  className="weapon-option"
                  style={{
                    backgroundImage: `url('images/Quality/${weapon.rarity}.png')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: '8px',
                    padding: '10px'
                  }}
                  onClick={() => {
                    onWeaponSelect(weapon);
                    setIsModalOpen(false);
                  }}
                >
                  <img
                    src={`images/Weapons/${selectedCharacter.weaponType}/${encodeURIComponent(weapon.name)}.png`}
                    alt={weapon.name}
                    className="weapon-img"
                  />
                  <div className="weapon-name">{weapon.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const rarityColors = {
  "5-star": "#fff7b5",
  "4-star": "#e1bef3",
  "3-star": "#b4d4da",
  "2-star": "#bad1bf",
  "1-star": "#868686"
};