import React from 'react';
import { EchoPanelState, ElementType } from '@/types/echo';
import { getStatPaths } from '@/types/stats';
import { calculateCV } from '@/hooks/useStats';
import { useSubstats } from '@/hooks/useSub';
import { getCachedEchoes } from '@/hooks/useEchoes';
import { SetSection } from './SetSection';
import { Echo, ECHO_BONUSES } from '@/types/echo';
import { getAssetPath } from '@/types/paths';
import { getEchoCVClass } from '../Save/Card';

export interface EchoDisplayProps {
  isVisible: boolean;
  echoPanels: EchoPanelState[];
  showRollQuality: boolean;
  showCV: boolean;
  leftStates?: Array<'start' | 'continue' | 'end' | 'none'>;
  rightStates?: Array<'start' | 'continue' | 'end' | 'none'>;
  sets: Array<{ element: ElementType; count: number }>;
  cv: number;
}

const getEchoPath = (echo: Echo, isPhantom: boolean = false) => {
  return getAssetPath('echoes', echo, false, isPhantom).cdn;
};

const EchoLeft = React.memo<{ 
  panel: EchoPanelState;
  element: string | null;
  showCV: boolean;
}>(function EchoLeft({ panel, element, showCV }) {
  const echo = getCachedEchoes(panel.id);
  const calculatePanelCV = React.useCallback(() => {
    const baseCV = calculateCV([panel]);
    const mainStat = panel.stats.mainStat.type;
    return baseCV - (mainStat?.includes('Crit') ? 44 : 0);
  }, [panel]);

  const statClass = React.useMemo(() => 
    panel.stats.mainStat.type?.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/%/g, '')
      .replace('-dmg', ''),
    [panel.stats.mainStat.type]
  );

  const bonusClasses = React.useMemo(() => {
    if (!echo?.name) return '';
    const bonuses = ECHO_BONUSES[echo.name];
    if (!bonuses) return '';

    return bonuses
      .map(bonus => bonus.stat.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/%/g, '')
        .replace('-dmg', '')
        .replace('resonance-', '')
        .replace('-bonus', ''))
      .join(' ');
  }, [echo?.name]);

  const formatMainStatValue = React.useCallback((value: number | null): string => {
    return value ? `${value.toFixed(1)}%` : '0';
  }, []);

  return (
    <div className="echo-left">
      {echo && (
        <>
          <img 
            src={getEchoPath(echo, panel.phantom)} 
            alt={echo.name} 
            className={`echo-display-icon ${bonusClasses}`} 
          />
          <div className={`echo-level-indicator ${showCV ? getEchoCVClass(calculatePanelCV()) : ''}`}>
            {showCV ? 
              `${calculatePanelCV().toFixed(1)} CV` : 
              `+${panel.level}`}
          </div>
          <div className="main-stat-wrapper">
            <img 
              src={getAssetPath('sets', element ?? '').cdn} 
              alt={`${element} Set Icon`} 
              className="set" 
            />
            {panel.stats.mainStat.type && (
              <>
                <img 
                  src={getStatPaths(panel.stats.mainStat.type).cdn} 
                  alt={panel.stats.mainStat.type} 
                  className={`main-stat-icon ${statClass}`} 
                />
                <span className={`main-stat-display ${statClass}`}>
                  {formatMainStatValue(panel.stats.mainStat.value)}
                </span>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  const prevEcho = getCachedEchoes(prevProps.panel.id);
  const nextEcho = getCachedEchoes(nextProps.panel.id);
  return prevProps.panel.level === nextProps.panel.level &&
    prevEcho?.name === nextEcho?.name &&
    prevProps.panel.stats.mainStat.type === nextProps.panel.stats.mainStat.type &&
    prevProps.panel.stats.mainStat.value === nextProps.panel.stats.mainStat.value &&
    prevProps.element === nextProps.element &&
    prevProps.panel.phantom === nextProps.panel.phantom &&
    prevProps.showCV === nextProps.showCV;
});

const EchoDivider = function EchoDivider() {
  return <div className="echo-divider" />;
};

const EchoRight = React.memo<{ 
  panel: EchoPanelState; 
  showRollQuality: boolean 
}>(function EchoRight({ panel, showRollQuality }) {
  const { substatsData } = useSubstats();

  const getQualityClass = React.useCallback((value: number | null, type: string | null): string => {
    if (!showRollQuality || !value || !type) return '';
    if (!substatsData || !substatsData[type]) return '';

    const allValues = substatsData[type];
    const quarterLength = Math.floor(allValues.length / 4);
    
    const valueIndex = allValues.findIndex((v: number) => v === value);
    if (valueIndex === -1) return '';
    
    if (valueIndex < quarterLength) return '2-star';
    if (valueIndex < quarterLength * 2) return '3-star';
    if (valueIndex < quarterLength * 3) return '4-star';
    return '5-star';
  }, [showRollQuality, substatsData]);

  const formatValue = React.useCallback((type: string | null, value: number | null): string => {
    if (!type || value === null) return '';
    const noPercentageStats = ['HP', 'ATK', 'DEF'];
    return noPercentageStats.includes(type) ? 
      value.toString() : 
      `${value}%`;
  }, []);

  const SubstatDisplay = React.memo<{
    stat: { type: string | null; value: number | null };
  }>(function SubstatDisplay({ stat }) {
    if (!stat.type) return null;

    const statClass = stat.type.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/%/g, '')
      .replace('-dmg', '');
    
    const quality = getQualityClass(stat.value, stat.type);

    return (
      <div 
        className={`substat-container ${statClass}`}
        style={showRollQuality && quality ? {
          backgroundImage: `url('images/Quality/${quality}.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom'
        } : undefined}
      >
        <img src={getStatPaths(stat.type).cdn} alt={stat.type} className="substat-icon" />
        <span className="substat-value">
          {formatValue(stat.type, stat.value)}
        </span>
      </div>
    );
  });

  return (
    <div className="echo-right">
      <div className="substat-grid">
        <SubstatDisplay stat={panel.stats.subStats[0]} />
        <SubstatDisplay stat={panel.stats.subStats[1]} />
        <SubstatDisplay stat={panel.stats.subStats[2]} />
        <SubstatDisplay stat={panel.stats.subStats[3]} />
        <SubstatDisplay stat={panel.stats.subStats[4]} />
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.showRollQuality === nextProps.showRollQuality && 
  JSON.stringify(prevProps.panel) === JSON.stringify(nextProps.panel);
});

const EchoRow = function EchoRow({ 
  panel, 
  showRollQuality,
  showCV
}: { 
  panel: EchoPanelState; 
  showRollQuality: boolean;
  showCV: boolean;
}) {
  const echo = getCachedEchoes(panel.id);
  const isSingleElement = echo?.elements.length === 1;
  const element = isSingleElement && echo ? 
    echo.elements[0] : 
    panel.selectedElement;
  
  const setClass = element ? `set-${element.toLowerCase()}` : 'default';

  return (
    <div className={`echo-row ${setClass}`}>
      <EchoLeft panel={panel} element={element} showCV={showCV} />
      <EchoDivider />
      <EchoRight panel={panel} showRollQuality={showRollQuality} />
    </div>
  );
};

export const EchoDisplay = function EchoDisplay({
  isVisible,
  echoPanels,
  showRollQuality,
  showCV,
  leftStates = Array(5).fill('none'),
  rightStates = Array(5).fill('none'),
  sets,
  cv
}: EchoDisplayProps) {
  if (!isVisible) return null;

  const getConnectionElement = (index: number, states: Array<'start' | 'continue' | 'end' | 'none'>): string => {
    if (states[index] === 'none') return '';
    if (states[index] === 'start') {
      const panel = echoPanels[index];
      const echo = getCachedEchoes(panel.id);
      return (panel.selectedElement || echo?.elements[0] || '').toLowerCase();
    }
    for (let i = index - 1; i >= 0; i--) {
      if (states[i] === 'start') {
        const panel = echoPanels[i];
        const echo = getCachedEchoes(panel.id);
        return (panel.selectedElement || echo?.elements[0] || '').toLowerCase();
      }
    }
    
    return '';
  };
  return (
    <div className="echo-display">
      {echoPanels.map((panel, index) => (
        <div key={index} className="row-container">
          <div className={`connector-segment left ${leftStates[index]} ${getConnectionElement(index, leftStates)}`} />
          <EchoRow 
            panel={panel} 
            showRollQuality={showRollQuality}
            showCV={showCV}
          />
          <div className={`connector-segment right ${rightStates[index]} ${getConnectionElement(index, rightStates)}`} />
        </div>
      ))}
      <SetSection sets={sets} cv={cv} echoPanels={echoPanels} />
    </div>
  );
};