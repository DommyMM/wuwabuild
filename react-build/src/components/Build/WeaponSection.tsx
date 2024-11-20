import React from 'react';
import { Weapon } from '../../types/weapon';
import { useLevelCurves } from '../../hooks/useLevelCurves';

interface WeaponSectionProps {
  weapon: Weapon;
  rank: number;
  level: number;
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

const WeaponStats: React.FC<{ weapon: Weapon; level: number }> = ({ weapon, level }) => {
  const { scaleAtk, scaleStat, loading, error } = useLevelCurves();

  if (loading || error) return null;

  const scaledAtk = scaleAtk(weapon.ATK, level);
  const scaledMainStat = scaleStat(weapon.base_main, level);

  return (
    <div className="weapon-stat-row">
      <div className="weapon-stat weapon-attack atk">
        <img 
          src="images/Resources/Attack.png" 
          className="stat-icon-img" 
          alt="ATK"
        />
        {Math.floor(scaledAtk)}
      </div>
      <div className={`weapon-stat weapon-main-stat ${weapon.main_stat.toLowerCase().replace(/\s+/g, '-').replace(/%/g, '').replace('-dmg', '')}`}>
        <img 
          src={`images/Stats/${weapon.main_stat}.png`}
          className="stat-icon-img" 
          alt={weapon.main_stat}
        />
        {`${scaledMainStat}%`}
      </div>
    </div>
  );
};

const PassiveText: React.FC<{ 
  weapon: Weapon;
  rank: number;
  characterElement?: string;
}> = ({ weapon, rank, characterElement }) => {
  if (!weapon.passive || !weapon.passive_stat) return null;

  const rankMultiplier = 1 + ((rank - 1) * 0.25);
  const scaledPassiveValue = Math.floor(weapon.passive_stat * rankMultiplier);
  
  const passiveName = weapon.passive.replace('%', '');
  const passiveClass = passiveName === 'ER' 
    ? 'energy-regen' 
    : passiveName.toLowerCase().replace(/\s+/g, '-').replace('-dmg', '');

  return (
    <div className={`weapon-passive ${
      passiveName === 'Attribute' && characterElement 
        ? characterElement.toLowerCase() 
        : passiveClass
    }`}>
      {`Passive:\n${scaledPassiveValue}% ${passiveName}`}
    </div>
  );
};

export const WeaponSection: React.FC<WeaponSectionProps> = ({
  weapon,
  rank,
  level
}) => {
  return (
    <div className="build-weapon-container">
      <WeaponIcon src={`images/Weapons/${weapon.type}/${encodeURIComponent(weapon.name)}.png`} />
      
      <div className="weapon-info">
        <WeaponName name={weapon.name} />
        <RankLevel rank={rank} level={level} />
        <WeaponStats weapon={weapon} level={level} />
        <PassiveText 
          weapon={weapon} 
          rank={rank}
          characterElement={weapon.main_stat === 'Attribute' ? weapon.main_stat : undefined}
        />
      </div>
      
      <RarityStars rarity={weapon.rarity} />
    </div>
  );
};