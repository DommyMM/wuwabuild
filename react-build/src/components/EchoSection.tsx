import React, { useState, useCallback, forwardRef } from 'react';
import { Echo } from '../types/echo';
import { useEchoes } from '../hooks/useEchoes';
import { useModalClose } from '../hooks/useModalClose';
import { StatsTab } from './StatsTab';
import '../styles/echoes.css';

const COST_SECTIONS = [4, 3, 1] as const;
type CostSection = typeof COST_SECTIONS[number];

const ELEMENT_SETS = {
  'Aero': 'Sierra Gale',
  'ER': 'Moonlit Clouds',
  'Electro': 'Void Thunder',
  'Spectro': 'Celestial Light',
  'Glacio': 'Freezing Frost',
  'Attack': 'Lingering Tunes', 
  'Fusion': 'Molten Rift',
  'Havoc': 'Sun-sinking Eclipse',
  'Healing': 'Rejuvenating Glow'
} as const;

type ElementType = keyof typeof ELEMENT_SETS;

interface ElementTabsProps {
  elements: ElementType[];
  onElementSelect?: (element: ElementType | null) => void;
}

const ElementTabs: React.FC<ElementTabsProps> = ({ elements, onElementSelect }) => {
  const [selectedElement, setSelectedElement] = useState<ElementType | null>(
    elements.length === 1 ? elements[0] : null
  );

  const getFontSize = (text: string) => text.length <= 16 ? '28px' : '20px';

  if (elements.length === 1) {
    const setName = ELEMENT_SETS[elements[0]];
    return (
      <div className="element-container">
        <div 
          className="set-name-display"
          style={{ 
            opacity: 1,
            fontSize: getFontSize(setName)
          }}
          data-element={elements[0]}
        >
          {setName}
        </div>
      </div>
    );
  }

  return (
    <div className="element-container">
      <div 
        className="set-name-display"
        style={{ 
          opacity: selectedElement ? 1 : 0,
          fontSize: selectedElement ? getFontSize(ELEMENT_SETS[selectedElement]) : undefined
        }}
        data-element={selectedElement || ''}
      >
        {selectedElement ? ELEMENT_SETS[selectedElement] : ''}
      </div>
      <div className="element-tabs">
        {elements.map((element, index) => (
          <div
            key={element}
            className={`element-tab ${selectedElement === element ? 'active' : ''}`}
            data-element={element}
            onClick={() => {
              const newElement = selectedElement === element ? null : element;
              setSelectedElement(newElement);
              onElementSelect?.(newElement);
            }}
          >
            <div className="element-number">{index + 1}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface EchoesSectionProps {
  isVisible: boolean;
}

interface EchoPanelProps {
  index: number;
  panelData: PanelData;
  onSelect: () => void;
  onReset: () => void;
  onStatsChange: (stats: PanelData['stats']) => void;
  onLevelChange: (level: number) => void;
  onElementSelect: (element: ElementType | null) => void;
}

interface PanelData {
  echo: Echo | null;
  level: number;
  selectedElement: ElementType | null;
  stats: {
    mainStat: { type: string | null; value: number | null };
    subStats: Array<{ type: string | null; value: number | null }>;
  };
}

const sliderStyles = {
  background: (level: number): React.CSSProperties => ({
    background: `linear-gradient(to right, #ffd700 0%, #ff8c00 ${(level/25)*100}%, #d3d3d3 ${(level/25)*100}%)`
  })
};

export const EchoPanel: React.FC<EchoPanelProps> = ({
  index,
  panelData,
  onSelect,
  onReset,
  onStatsChange,
  onLevelChange,
  onElementSelect
}) => {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    onLevelChange(value);
  };

  return (
    <div className="echo-panel" id={`panel${index}`}>
      <div className="manual-section">
        <p id="selectedEchoLabel" style={{ fontSize: '30px', textAlign: 'center' }}>
          {panelData.echo?.name || `Echo ${index}`}
        </p>
        <div 
          className="select-box" 
          id="selectEcho" 
          onClick={onSelect}
          style={{ right: panelData.echo ? '10%' : '0' }}
        >
          <img
            src={panelData.echo ? `images/Echoes/${panelData.echo.name}.png` : 'images/Resources/Echo.png'}
            alt={panelData.echo?.name || 'Select Echo'}
            className="select-img"
            id="echoImg"
          />
        </div>
        {panelData.echo && (
          <ElementTabs 
            elements={panelData.echo.elements} 
            onElementSelect={onElementSelect}
          />
        )}
      </div>
      
      <div className="echo-level-container">
        <div className="echo-slider-group">
          <input
            type="range"
            min="0"
            max="25"
            value={panelData.level}
            className="echo-slider"
            style={sliderStyles.background(panelData.level)}
            onChange={handleSliderChange}
          />
          <div className="echo-level-value">{panelData.level}</div>
        </div>
      </div>
      
      <StatsTab
        panelId={`panel${index}`}
        cost={panelData.echo?.cost ?? null}
        level={panelData.level}
        onStatsChange={onStatsChange}
      />

      <button className="clear-button" onClick={onReset}>
        Reset
      </button>
    </div>
  );
};

export const EchoesSection = forwardRef<HTMLElement, EchoesSectionProps>(
  ({ isVisible }, ref) => {
    const { echoesByCost, loading, error } = useEchoes();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPanelIndex, setSelectedPanelIndex] = useState<number | null>(null);
    
    const [panels, setPanels] = useState<PanelData[]>(
      Array(5).fill(null).map(() => ({
        echo: null,
        level: 0,
        selectedElement: null,
        stats: {
          mainStat: { type: null, value: null },
          subStats: Array(5).fill(null).map(() => ({ type: null, value: null }))
        }
      }))
    );

    useModalClose(isModalOpen, () => setIsModalOpen(false));

    const handleReset = useCallback((index: number) => {
      setPanels(prev => {
        const newPanels = [...prev];
        newPanels[index] = {
          echo: null,
          level: 0,
          selectedElement: null,
          stats: {
            mainStat: { type: null, value: null },
            subStats: Array(5).fill(null).map(() => ({ type: null, value: null }))
          }
        };
        return newPanels;
      });
    }, []);

    const handleStatsChange = useCallback((index: number, stats: PanelData['stats']) => {
      setPanels(prev => {
        const newPanels = [...prev];
        newPanels[index] = { ...newPanels[index], stats };
        return newPanels;
      });
    }, []);

    const handleLevelChange = useCallback((index: number, level: number) => {
      setPanels(prev => {
        const newPanels = [...prev];
        newPanels[index] = { ...newPanels[index], level };
        return newPanels;
      });
    }, []);

    const handleElementSelect = useCallback((index: number, element: ElementType | null) => {
      setPanels(prev => {
        const newPanels = [...prev];
        newPanels[index] = { ...newPanels[index], selectedElement: element };
        return newPanels;
      });
    }, []);

    const handleSelectEcho = useCallback((echo: Echo) => {
      if (selectedPanelIndex === null) return;
      setPanels(prev => {
        const newPanels = [...prev];
        newPanels[selectedPanelIndex] = {
          ...newPanels[selectedPanelIndex],
          echo
        };
        return newPanels;
      });
      setIsModalOpen(false);
    }, [selectedPanelIndex]);

    return (
      <>
        <section className="echoes-tab" style={{ display: isVisible ? 'block' : 'none' }} ref={ref}>
          <div className="echoes-content" style={{ display: isVisible ? 'flex' : 'none' }}>
            <div className="echo-panels-container">
              {panels.map((panel, i) => (
                <EchoPanel
                  key={i}
                  index={i + 1}
                  panelData={panel}
                  onSelect={() => {
                    setSelectedPanelIndex(i);
                    setIsModalOpen(true);
                  }}
                  onReset={() => handleReset(i)}
                  onStatsChange={(stats) => handleStatsChange(i, stats)}
                  onLevelChange={(level) => handleLevelChange(i, level)}
                  onElementSelect={(element) => handleElementSelect(i, element)}
                />
              ))}
            </div>
          </div>
        </section>

        {isModalOpen && (
          <div className="modal">
            <div className="echo-modal-content">
              <span className="close" onClick={() => setIsModalOpen(false)}>&times;</span>
              <div className="echo-list">
                {loading && <div>Loading echoes...</div>}
                {error && <div className="error">{error}</div>}
                {COST_SECTIONS.map((cost: CostSection) => (
                  <div key={cost} className="echo-cost-section">
                    <div className="cost-label">{cost} Cost</div>
                    <div className="echo-grid">
                      {echoesByCost[cost]?.map(echo => (
                        <div 
                          key={echo.name}
                          className="echo-option"
                          onClick={() => handleSelectEcho(echo)}
                        >
                          <img
                            src={`images/Echoes/${echo.name}.png`}
                            alt={echo.name}
                            className="echo-img"
                          />
                          <span className="echo-name">{echo.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
);