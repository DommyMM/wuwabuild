import React, { useMemo } from 'react';
import { StatName, getStatIconName } from '../../types/stats';
import '../../styles/menu.css';

interface StatRowProps {
  name: StatName;
  value: string;
  baseValue?: number;
  update?: number;
}

const formatClassName = (name: string): string => {
  const cleanedName = name
    .toLowerCase()
    .replace(/resonance-?/g, '')
    .replace(/-?(dmg|bonus)/g, '')
    .replace(/(\s|%)+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
    
  return cleanedName;
};

const useStatClasses = (name: string) => {
  return useMemo(() => ({
    statClassName: formatClassName(name)
  }), [name]);
};

const StatRow: React.FC<StatRowProps> = ({ name, value, baseValue, update }) => {
  const isBaseStatType = ['HP', 'ATK', 'DEF'].includes(name);
  const showBreakdown = isBaseStatType || ['Energy Regen', 'Crit Rate', 'Crit DMG'].includes(name);
  const { statClassName } = useStatClasses(name);
  
  const displayName = name.endsWith('DMG') && !name.startsWith('Crit') ? `${name} Bonus` : name;
  return (
    <div className={`stat-row ${statClassName}`}>
      <div className="stat-left">
        <img src={`images/Stats/${getStatIconName(name)}.png`}
          alt={`${name} icon`}
          className="stat-icon"
        />
        <span className="stat-name">{displayName}</span>
      </div>
      <div className="stat-value-container">
        <span className="stat-number">{value}</span>
        {showBreakdown && typeof update === 'number' && update !== 0 && (
          <div className="stat-breakdown">
            {isBaseStatType && typeof baseValue === 'number' && (
              <span className="base-value">{baseValue}</span>
            )}
            <span className="update-value">
              {isBaseStatType ? ` + ${update.toFixed(1)}` : `+${update.toFixed(1)}%`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

interface StatSectionProps {
  isVisible: boolean;
  stats: Array<{
    name: StatName;
    value: string;
    baseValue?: number;
    update?: number;
  }>;
}

export const StatSection: React.FC<StatSectionProps> = ({ isVisible, stats }) => {
  if (!isVisible) return null;

  return (
    <section className="stats-section">
      {stats.map((stat) => (
        <StatRow key={`stat-${stat.name}`}
          name={stat.name}
          value={stat.value}
          baseValue={stat.baseValue}
          update={stat.update}
        />
      ))}
    </section>
  );
};