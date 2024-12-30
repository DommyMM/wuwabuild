import React from 'react';
import { EchoPanelState } from '../../types/echo';
import { getStatIconName } from '../../types/stats';
import { useSubstats } from '../../hooks/useSub';

export interface EchoDisplayProps {
  isVisible: boolean;
  echoPanels: EchoPanelState[];
  showRollQuality: boolean;
}

const EchoLeft: React.FC<{ 
  panel: EchoPanelState;
  element: string | null;
}> = React.memo(({ panel, element }) => {
  const statClass = React.useMemo(() => 
    panel.stats.mainStat.type?.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/%/g, '')
      .replace('-dmg', ''),
    [panel.stats.mainStat.type]
  );

  const formatMainStatValue = React.useCallback((value: number | null): string => {
    return value ? `${value.toFixed(1)}%` : '0';
  }, []);

  return (
    <div className="echo-left">
      {panel.echo && (
        <>
          <img src={`images/Echoes/${panel.echo.name}.png`}
            alt={panel.echo.name}
            className="echo-display-icon"
          />
          <div className="echo-level-indicator">+{panel.level}</div>
          {panel.stats.mainStat.type && (
            <div className="main-stat-wrapper">
              <img src={`images/SetIcons/${element}.png`}
                alt={`${element} Set Icon`}
                className="set"
              />
              <img src={`images/Stats/${getStatIconName(panel.stats.mainStat.type)}.png`}
                alt={panel.stats.mainStat.type}
                className={`main-stat-icon ${statClass}`}
              />
              <span className={`main-stat-display ${statClass}`}>
                {formatMainStatValue(panel.stats.mainStat.value)}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.panel.level === nextProps.panel.level &&
         prevProps.panel.echo?.name === nextProps.panel.echo?.name &&
         prevProps.panel.stats.mainStat.type === nextProps.panel.stats.mainStat.type &&
         prevProps.panel.stats.mainStat.value === nextProps.panel.stats.mainStat.value &&
         prevProps.element === nextProps.element;
});

const EchoDivider = () => <div className="echo-divider" />;

const EchoRight: React.FC<{ panel: EchoPanelState; showRollQuality: boolean }> = React.memo(({ 
  panel, 
  showRollQuality 
}) => {
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
  }>(({ stat }) => {
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
        <img src={`images/Stats/${getStatIconName(stat.type)}.png`}
          alt={stat.type}
          className="substat-icon"
        />
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

const EchoRow: React.FC<{ panel: EchoPanelState; showRollQuality: boolean }> = ({ 
  panel, 
  showRollQuality 
}) => {
  const isSingleElement = panel.echo?.elements.length === 1;
  const element = isSingleElement && panel.echo ? 
    panel.echo?.elements[0] : 
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

export const EchoDisplay: React.FC<EchoDisplayProps> = ({
  isVisible,
  echoPanels,
  showRollQuality
}) => {
  if (!isVisible) return null;

  return (
    <div className="echo-display">
      {echoPanels.map((panel, index) => (
        <EchoRow 
          key={index}
          panel={panel}
          showRollQuality={showRollQuality}
        />
      ))}
    </div>
  );
};