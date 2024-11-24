import React from 'react';
import { Weapon, ScaledWeaponStats } from '../../types/weapon';

interface WeaponSectionProps {
  weapon: Weapon;
  rank: number;
  level: number;
  scaledStats: ScaledWeaponStats;
  characterElement?: string;
}

const WeaponIcon: React.FC<{ src: string }> = ({ src }) => (
  <img src={src} className="build-weapon-icon" alt="Weapon" />
);

const WeaponName: React.FC<{ name: string }> = ({ name }) => (
  <div className="weapon-stat weapon-name">{name}</div>
);

const RankLevel: React.FC<{ rank: number; level: number }> = ({ rank, level }) => (
  <div className="weapon-stat-row">
    <div className="weapon-stat weapon-rank">R{rank}</div>
    <div className="weapon-stat weapon-level">Lv.{level}/90</div>
  </div>
);

const RarityStars: React.FC<{ rarity: string }> = ({ rarity }) => {
  const starCount = parseInt(rarity.charAt(0));
  return (
    <div className="build-weapon-star-container">
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

const WeaponStats: React.FC<{ 
  weapon: Weapon; 
  scaledStats: ScaledWeaponStats;
}> = ({ weapon, scaledStats }) => (
  <div className="weapon-stat-row">
    <div className="weapon-stat weapon-attack atk">
      <img 
        src="images/Resources/Attack.png" 
        className="stat-icon-img" 
        alt="ATK"
      />
      {Math.floor(scaledStats.scaledAtk)}
    </div>
    <div className={`weapon-stat weapon-main-stat ${weapon.main_stat.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/%/g, '')
      .replace('-dmg', '')}`}>
      <img 
        src={`images/Stats/${weapon.main_stat}.png`}
        className="stat-icon-img" 
        alt={weapon.main_stat}
      />
      {`${scaledStats.scaledMainStat}%`}
    </div>
  </div>
);

const PassiveText: React.FC<{ 
  weapon: Weapon;
  scaledStats: ScaledWeaponStats;
  characterElement?: string;
}> = ({ weapon, scaledStats, characterElement }) => {
  if (!weapon.passive || !weapon.passive_stat) return null;
  
  const passiveName = weapon.passive.replace('%', '');
  const passiveClass = passiveName === 'ER' 
    ? 'energy-regen' 
    : passiveName.toLowerCase().replace(/\s+/g, '-').replace('-dmg', '');

  const classNames = [
    'weapon-passive'
  ];

  if (passiveName === 'Attribute' && characterElement) {
    classNames.push(characterElement.toLowerCase());
  }

  classNames.push(passiveClass);

  return (
    <div className={classNames.join(' ')}>
      {`Passive:\n${scaledStats.scaledPassive}% ${passiveName}`}
    </div>
  );
};

export const WeaponSection: React.FC<WeaponSectionProps> = ({
  weapon,
  rank,
  level,
  scaledStats,
  characterElement
}) => {
  return (
    <div className="build-weapon-container">
      <WeaponIcon src={`images/Weapons/${weapon.type}/${encodeURIComponent(weapon.name)}.png`} />
      
      <div className="weapon-info">
        <WeaponName name={weapon.name} />
        <RankLevel rank={rank} level={level} />
        <WeaponStats weapon={weapon} scaledStats={scaledStats} />
        <PassiveText 
          weapon={weapon} 
          scaledStats={scaledStats}
          characterElement={characterElement}
        />
      </div>
      
      <RarityStars rarity={weapon.rarity} />
    </div>
  );
};