import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Character } from '../../types/character';
import { Weapon, WeaponState } from '../../types/weapon';
import { getCachedWeapon, weaponCache } from '../../hooks/useWeapons';
import { useModalClose } from '../../hooks/useModalClose';
import { WeaponSlider } from './WeaponSlider';
import { getAssetPath } from '../../types/paths';
import '../../styles/WeaponSelection.css';
import '../../styles/modal.css';
import '../../styles/WeaponSlider.css';

interface WeaponSelectionProps {
  selectedCharacter: Character;
  weaponState: WeaponState;
  onWeaponSelect: (weapon: Weapon | null) => void;
  onWeaponConfigChange: (level: number, rank: number) => void;
  ocrData?: {
    type: 'Weapon';
    name: string;
    weaponType: string;
    weaponLevel: number;
    rank: number;
  };
}

const rarityColors = {
  "5-star": "#fff7b5",
  "4-star": "#e1bef3",
  "3-star": "#b4d4da",
  "2-star": "#bad1bf",
  "1-star": "#868686"
};

export const WeaponSelection: React.FC<WeaponSelectionProps> = ({
  selectedCharacter,
  weaponState,
  onWeaponSelect,
  onWeaponConfigChange,
  ocrData
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastOcrWeapon, setLastOcrWeapon] = useState<string | undefined>();

  const weapons = useMemo(() => 
    weaponCache.get(selectedCharacter.weaponType) ?? [],
    [selectedCharacter.weaponType]
  );

  const selectedWeapon = useMemo(() => 
    getCachedWeapon(weaponState.id),
    [weaponState.id]
  );

  const rarityOrder = useMemo(() => 
    ["5-star", "4-star", "3-star", "2-star", "1-star"], 
  []); 

  const sortedWeapons = useMemo(() => 
    [...weapons].sort((a, b) => 
      rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity)
    ), 
  [weapons, rarityOrder]);

  useEffect(() => {
    setLastOcrWeapon(undefined);
  }, [selectedCharacter.name]);

  useEffect(() => {
    if (ocrData?.name && !lastOcrWeapon) {
      const matchedWeapon = weapons.find(
        weapon => weapon.name.toLowerCase() === ocrData.name.toLowerCase()
      );
      if (matchedWeapon) {
        setLastOcrWeapon(ocrData.name);
        onWeaponSelect(matchedWeapon);
        onWeaponConfigChange(ocrData.weaponLevel, ocrData.rank);
      }
    }
  }, [ocrData, weapons, lastOcrWeapon, onWeaponSelect, onWeaponConfigChange]);

  useModalClose(isModalOpen, () => setIsModalOpen(false));

  const handleLevelChange = useCallback((level: number) => {
    onWeaponConfigChange(level, weaponState.rank);
  }, [weaponState.rank, onWeaponConfigChange]);

  const handleRankChange = useCallback((rank: number) => {
    onWeaponConfigChange(weaponState.level, rank);
  }, [weaponState.level, onWeaponConfigChange]);

  return (
    <>
      <div className="weapon-selection">
        <div className="weapon-choice">Weapon</div>
        <div className="weapon-box" id="selectWeapon" onClick={() => setIsModalOpen(true)}>
          <img
            id="weaponImg"
            src={selectedWeapon ? getAssetPath('weapons', selectedWeapon).cdn
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
          <WeaponSlider level={weaponState.level}
            rank={weaponState.rank}
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
              {sortedWeapons.map(weapon => (
                <div key={weapon.name}
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
                  <img src={getAssetPath('weapons', weapon).cdn}
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