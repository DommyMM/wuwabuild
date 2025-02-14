import React, { useCallback } from 'react';
import { ScaledStats, Weapon } from '../../types/weapon';
import { getAssetPath } from '../../types/paths';
import { getStatPaths } from '../../types/stats';

interface WeaponSectionProps {
  weapon: Weapon;
  rank: number;
  level: number;
  scaledStats: ScaledStats;
  characterElement?: string;
  useAltSkin?: boolean;
}

const getWeaponPath = (weapon: Weapon, useAltSkin: boolean = false) => {
  return getAssetPath('weapons', weapon, useAltSkin).local;
};

const WeaponIcon = React.memo<{ weapon: Weapon; useAltSkin?: boolean }>(
  ({ weapon, useAltSkin = false }) => (
    <img src={getWeaponPath(weapon, useAltSkin)} className="weapon-icon" alt="Weapon" />
  )
);

const WeaponName = React.memo<{ name: string }>(({ name }) => (
  <div className="weapon-stat weapon-name">{name}</div>
));

const StatsTopRow = React.memo<{
  scaledAtk: number;
  weapon: Weapon;
  scaledMainStat: number;
}>(({ scaledAtk, weapon, scaledMainStat }) => (
  <div className="weapon-stat-row">
    <div className="weapon-stat weapon-attack atk">
      <img src={getStatPaths('ATK').local} className="stat-icon-img" alt="ATK"/>
      {Math.floor(scaledAtk)}
    </div>
    <div className={`weapon-stat weapon-main-stat ${weapon.main_stat.toLowerCase()}`}>
      <img src={getStatPaths(weapon.main_stat).local} className="stat-icon-img" alt={weapon.main_stat}/>
      {`${scaledMainStat}%`}
    </div>
  </div>
));

const StatsBottomRow = React.memo<{
  level: number;
  rank: number;
}>(({ level, rank }) => (
  <div className="weapon-stat-row">
    <div className="weapon-stat weapon-rank">R{rank}</div>
    <div className="weapon-stat weapon-level">Lv.{level}</div>
  </div>
));

const RarityStars: React.FC<{ rarity: string }> = ({ rarity }) => {
  const starCount = parseInt(rarity.charAt(0));
  return (
    <div className="weapon-star-container">
      {[...Array(starCount)].map((_, i) => (
        <img 
          key={i} 
          src="images/Resources/Star.png" 
          className="star-icon" 
          alt="*" 
        />
      ))}
    </div>
  );
};

export const WeaponSection: React.FC<WeaponSectionProps> = ({
  weapon,
  rank,
  level,
  scaledStats,
  characterElement,
  useAltSkin = false
}) => {
  const getPassiveClasses = useCallback((
    passiveName: string, 
    characterElement?: string
  ) => {
    const classNames = ['weapon-passive'];
    if (passiveName === 'Attribute' && characterElement) {
      classNames.push(characterElement.toLowerCase());
    }
    classNames.push(passiveName === 'ER' ? 
      'energy-regen' : 
      passiveName.toLowerCase().replace(/\s+/g, '-').replace('-dmg', '')
    );
    return classNames;
  }, []);

  const PassiveText = React.memo<{ 
    weapon: Weapon;
    stats: {
      scaledPassive?: number;
      scaledPassive2?: number;
    };
    characterElement?: string;
  }>(({ weapon, stats, characterElement }) => {
    if (!weapon.passive || !weapon.passive_stat) return null;
    
    const passiveName = weapon.passive.replace('%', '');
    const classNames = getPassiveClasses(passiveName, characterElement);

    return (
      <div className={classNames.join(' ')}>
        {`${stats.scaledPassive}% ${passiveName}`}
      </div>
    );
  });

  return (
    <div className="weapon-display">
      <RarityStars rarity={weapon.rarity} />
      <div className='weapon-container'>
        <WeaponIcon weapon={weapon} useAltSkin={useAltSkin} />
        <div className="weapon-info">
          <WeaponName name={weapon.name} />
          <StatsTopRow scaledAtk={scaledStats.scaledAtk} weapon={weapon} scaledMainStat={scaledStats.scaledMainStat} />
          <StatsBottomRow level={level} rank={rank} />
          <PassiveText weapon={weapon} stats={scaledStats} characterElement={characterElement} />
        </div>
      </div>
    </div>
  );
};