import React from 'react';
import { StatName, getStatIconName } from '../../types/stats';
import { ELEMENT_SETS, ElementType } from '../../types/echo';
import '../../styles/menu.css';

interface StatRowProps {
  name: StatName;
  value: string;
  baseValue?: number;
  update?: number;
}

const StatRow: React.FC<StatRowProps> = ({ name, value, baseValue, update }) => {
  const isBaseStatType = ['HP', 'ATK', 'DEF'].includes(name);
  
  const getNameClass = (name: string) => {
    const length = name.length;
    if (length <= 18) return '';
    if (length <= 21) return 'short';
    if (length <= 24) return 'medium';
    return 'long';
  };

  return (
    <div className={`stat-row ${name.toLowerCase().replace(/\s+/g, '-').replace(/%/g, '').replace('-dmg', '')}`}>
      <div className="stat-left">
        <img 
          src={`images/Stats/${getStatIconName(name)}.png`}
          alt={name}
          className="stat-icon"
        />
        <span className={`stat-name ${getNameClass(name)}`}>{name}</span>
      </div>
      
      <div className="stat-value-container">
        <span className="stat-number">{value}</span>
        {update !== undefined && update !== 0 && (
          <div className="stat-breakdown">
            {isBaseStatType && baseValue !== undefined && (
              <span className="base-value">{Number(baseValue).toFixed(1)}</span>
            )}
            <span className="update-value">
              {isBaseStatType ? 
                ` + ${Number(update).toFixed(1)}` : 
                `+${Number(update).toFixed(1)}%`
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
}

const SetRow: React.FC<SetRowProps> = ({ element, count }) => {
  const setName = ELEMENT_SETS[element];
  const fontSize = setName.length > 15 ? '32px' : '42px';

  return (
    <div className={`set-row ${element.toLowerCase()}`}>
      <div className={`set-icon-container set-${element.toLowerCase()}`}>
        <img
          src={`images/Sets/${element}.png`}
          alt={element}
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
    <div className="stats-section">
      <div className="stats-container">
        {stats.map((stat, index) => (
          <StatRow
            key={index}
            name={stat.name}
            value={stat.value}
            baseValue={stat.baseValue}
            update={stat.update}
          />
        ))}
      </div>

      {sets.length > 0 && (
        <div className="set-container">
          {sets.map((set, index) => (
            <SetRow
              key={index}
              element={set.element}
              count={set.count}
            />
          ))}
        </div>
      )}
    </div>
  );
};