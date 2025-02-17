import React from 'react';
import { EchoPanelState, ElementType } from '@/types/echo';
import { getStatPaths } from '@/types/stats';
import { useSubstats } from '@/hooks/useSub';
import { getCachedEchoes } from '@/hooks/useEchoes';
import { SetSection } from './SetSection';
import { Echo, ECHO_BONUSES } from '@/types/echo';
import { getAssetPath } from '@/types/paths';

export interface EchoDisplayProps {
  isVisible: boolean;
  echoPanels: EchoPanelState[];
  showRollQuality: boolean;
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
}>(function EchoLeft({ panel, element }) {
  const echo = getCachedEchoes(panel.id);
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={getEchoPath(echo, panel.phantom)} 
            alt={echo.name} 
            className={`echo-display-icon ${bonusClasses}`} 
          />
          <div className="echo-level-indicator">+{panel.level}</div>
          <div className="main-stat-wrapper">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={getAssetPath('sets', element ?? '').cdn} 
              alt={`${element} Set Icon`} 
              className="set" 
            />
            {panel.stats.mainStat.type && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
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
    prevProps.panel.phantom === nextProps.panel.phantom;
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
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

const EchoRow = function EchoRow({ panel, showRollQuality }: { 
  panel: EchoPanelState; 
  showRollQuality: boolean 
}) {
  const echo = getCachedEchoes(panel.id);
  const isSingleElement = echo?.elements.length === 1;
  const element = isSingleElement && echo ? 
    echo.elements[0] : 
    panel.selectedElement;
  
  const setClass = element ? `set-${element.toLowerCase()}` : 'default';

  return (
    <div className={`echo-row ${setClass}`}>
      <EchoLeft panel={panel} element={element} />
      <EchoDivider />
      <EchoRight panel={panel} showRollQuality={showRollQuality} />
    </div>
  );
};

export const EchoDisplay = function EchoDisplay({
  isVisible,
  echoPanels,
  showRollQuality,
  leftStates = Array(5).fill('none'),
  rightStates = Array(5).fill('none'),
  sets,
  cv
}: EchoDisplayProps) {
  if (!isVisible) return null;

  const leftElement = leftStates.some(state => state !== 'none') ? 
    (echoPanels.find(panel => {
      const echo = getCachedEchoes(panel.id);
      return panel.selectedElement || echo?.elements[0];
    })?.selectedElement || 
    getCachedEchoes(echoPanels[0]?.id)?.elements[0])?.toLowerCase() : '';
  
  const rightElement = rightStates.some(state => state !== 'none') ? 
    (echoPanels.find((panel, i) => {
      if (rightStates[i] !== 'none') {
        const echo = getCachedEchoes(panel.id);
        return panel.selectedElement || echo?.elements[0];
      }
      return false;
    })?.selectedElement || 
    getCachedEchoes(echoPanels[0]?.id)?.elements[0])?.toLowerCase() : '';

  return (
    <div className="echo-display">
      {echoPanels.map((panel, index) => (
        <div key={index} className="row-container">
          <div className={`connector-segment left ${leftStates[index]} ${leftElement}`} />
          <EchoRow 
            panel={panel} 
            showRollQuality={showRollQuality} 
          />
          <div className={`connector-segment right ${rightStates[index]} ${rightElement}`} />
        </div>
      ))}
      <SetSection sets={sets} cv={cv} echoPanels={echoPanels} />
    </div>
  );
};