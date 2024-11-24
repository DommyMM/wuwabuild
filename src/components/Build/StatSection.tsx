import React, { useMemo } from 'react';
import { StatName, getStatIconName } from '../../types/stats';
import { ELEMENT_SETS, ElementType } from '../../types/echo';
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
    
  return `${cleanedName}`;
};
const getNameClass = (length: number): string => {
  if (length <= 18) return '';
  if (length <= 21) return 'short';
  if (length <= 24) return 'medium';
  return 'long';
};

const useStatClasses = (name: string) => {
  return useMemo(() => ({
    statClassName: formatClassName(name),
    nameClass: getNameClass(name.length)
  }), [name]);
};

const StatRow: React.FC<StatRowProps> = ({ name, value, baseValue, update }) => {
  const isBaseStatType = ['HP', 'ATK', 'DEF'].includes(name);
  const showBreakdown = isBaseStatType || 
                       ['Energy Regen', 'Crit Rate', 'Crit DMG'].includes(name);
  const { statClassName, nameClass } = useStatClasses(name);

  return (
    <div className={`stat-row ${statClassName}`} role="row">
      <div className="stat-left" role="cell">
        <img 
          src={`images/Stats/${getStatIconName(name)}.png`}
          alt={`${name} icon`}
          className="stat-icon"
        />
        <span className={`stat-name ${nameClass}`}>{name}</span>
      </div>
      
      <div className="stat-value-container" role="cell">
        <span className="stat-number">{value}</span>
        {showBreakdown && typeof update === 'number' && update !== 0 && (
          <div className="stat-breakdown">
            {isBaseStatType && typeof baseValue === 'number' && (
              <span className="base-value">{baseValue.toFixed(1)}</span>
            )}
            <span className="update-value">
              {isBaseStatType ? 
                ` + ${update.toFixed(1)}` : 
                `+${update.toFixed(1)}%`
              }
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

interface SetRowProps {
  element: ElementType;
  count: number;
  index: number;
}

const SetRow: React.FC<SetRowProps> = ({ element, count, index }) => {
  const setName = ELEMENT_SETS[element];
  const fontSize = setName.length > 15 ? '32px' : '42px';

  return (
    <div 
      className={`set-row ${element.toLowerCase()}`}
      role="row"
      aria-label={`${setName} set bonus ${count >= 5 ? '5' : '2'} pieces`}
    >
      <div className={`set-icon-container set-${element.toLowerCase()}`}>
        <img
          src={`images/Sets/${element}.png`}
          alt={`${element} set icon`}
          className="set-icon"
        />
      </div>
      <span className="set-name" style={{ fontSize }}>
        {setName}
      </span>
      <span className="set-count">{count >= 5 ? '5' : '2'}</span>
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
  sets: Array<{
    element: ElementType;
    count: number;
  }>;
}

export const StatSection: React.FC<StatSectionProps> = ({ 
  isVisible,
  stats,
  sets
}) => {
  if (!isVisible) return null;

  return (
    <section className="stats-section" aria-label="Character Statistics">
      <div className="stats-container" role="table">
        {stats.map((stat) => (
          <StatRow
            key={`stat-${stat.name}`}
            name={stat.name}
            value={stat.value}
            baseValue={stat.baseValue}
            update={stat.update}
          />
        ))}
      </div>

      {sets.length > 0 && (
        <div className="set-container" role="table">
          {sets.map((set, index) => (
            <SetRow
              key={`set-${set.element}`}
              element={set.element}
              count={set.count}
              index={index}
            />
          ))}
        </div>
      )}
    </section>
  );
};