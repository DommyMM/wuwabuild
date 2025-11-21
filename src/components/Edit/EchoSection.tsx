'use client';

import React, { useState, useCallback } from 'react';
import { ChevronLeft, ChevronDown } from 'lucide-react';
import { Echo, ElementType, ELEMENT_SETS, EchoPanelState as PanelData, COST_SECTIONS, CostSection, PHANTOM_ECHOES } from '@/types/echo';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableEchoPanel } from './SortableEchoPanel';
import { SavedEchoData } from '@/types/SavedState';
import { cachedEchoes, getCachedEchoes } from '@/hooks/useEchoes';
import { useModalClose } from '@/hooks/useModalClose';
import { StatsTab } from './StatsTab';
import { getAssetPath } from '@/types/paths';
import '@/styles/echoes.css';

interface ElementTabsProps {
  elements: ElementType[];
  onElementSelect?: (element: ElementType | null) => void;
  selectedElement: ElementType | null;
}

const ElementTabs: React.FC<ElementTabsProps> = ({ elements, onElementSelect, selectedElement }) => {
  const getFontSize = (text: string) => text.length <= 16 ? '28px' : '20px';

  if (elements.length === 1) {
    const setName = ELEMENT_SETS[elements[0]];
    return (
      <div className="element-container">
        <div className={`set-name-display ${elements[0].toLowerCase()}`}
          style={{ 
            opacity: 1,
            fontSize: getFontSize(setName)
          }}
        >
          {setName}
        </div>
      </div>
    );
  }

  return (
    <div className="element-container">
      <div 
        className={`set-name-display ${selectedElement?.toLowerCase() || 'default'}`}
        style={{ 
          opacity: selectedElement ? 1 : 0,
          fontSize: selectedElement ? getFontSize(ELEMENT_SETS[selectedElement]) : undefined
        }}
      >
        {selectedElement ? ELEMENT_SETS[selectedElement] : ''}
      </div>
      <div className="element-tabs">
        {elements.map((element, index) => (
          <div
            key={element}
            className={`element-tab ${selectedElement === element ? 'active' : ''}`}
            onClick={() => onElementSelect?.(selectedElement === element ? null : element)}
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
  isMinimized: boolean;
  onMinimize: () => void;
  initialPanels: PanelData[];
  onLevelChange?: (index: number, level: number) => void;
  onElementSelect?: (index: number, element: ElementType | null) => void;
  onEchoSelect?: (index: number, id: string) => void;
  onMainStatChange?: (index: number, type: string | null) => void;
  onSubStatChange?: (index: number, subIndex: number, type: string | null, value: number | null) => void;
  onPanelChange?: (panels: PanelData[]) => void;
  savedEchoes?: SavedEchoData[];
  onSaveEcho?: (index: number) => void;
  onLoadEcho?: (savedEcho: SavedEchoData, targetIndex: number) => void;
  onDeleteEcho?: (echoId: string) => void;
  showCostWarning?: boolean;
  onCostWarningDismiss?: () => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export interface DragHandleProps {
  [key: string]: unknown;
  role?: string;
  tabIndex?: number;
  'aria-describedby'?: string;
  onMouseDown?: (e: React.MouseEvent) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

interface EchoPanelProps {
  index: number;
  panelData: PanelData;
  onSelect: () => void;
  onReset: () => void;
  onLevelChange: (level: number) => void;
  onElementSelect: (element: ElementType | null) => void;
  onMainStatChange: (type: string | null) => void;
  onSubStatChange: (subIndex: number, type: string | null, value: number | null) => void;
  onSave?: () => void;
  onLoad?: () => void;
  onPhantomChange: (value: boolean) => void;
  dragHandleProps?: DragHandleProps;
}

const getEchoLabelFontSize = (name?: string) => {
  if (!name) return '30px';
  if (name.length >= 26) return '22px';
  return name.length < 24 ? '30px' : '26px';
};

export const EchoPanel: React.FC<EchoPanelProps> = ({
  index,
  panelData,
  onSelect,
  onReset,
  onLevelChange,
  onElementSelect,
  onMainStatChange,
  onSubStatChange,
  onSave,
  onLoad,
  onPhantomChange,
  dragHandleProps
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const echo = getCachedEchoes(panelData.id);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    onLevelChange(value);
  };

  const handleSave = () => {
    onSave?.();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="echo-panel" id={`panel${index}`}>
      <div className="manual-section">
        <div id="selectedEchoLabel" style={{ fontSize: getEchoLabelFontSize(echo?.name) }} {...dragHandleProps} >
          {echo?.name || `Echo ${index}`}
        </div>
        <div className="select-box" id="selectEcho" onClick={onSelect} style={{ right: echo ? '10%' : '0' }}>
          <img src={echo ? getAssetPath('echoes', echo).cdn : '/images/Resources/Echo.png'}
            alt={echo?.name || 'Select Echo'}
            className="select-img"
            id="echoImg"
          />
        </div>
        {echo && (
          <ElementTabs elements={echo.elements} onElementSelect={onElementSelect} selectedElement={panelData.selectedElement} />
        )}
      </div>
      <div className="echo-level-container">
        <div className="echo-slider-group">
          <input type="range" min="0" max="25" value={panelData.level || 0} className="echo-slider"
            style={{
              background: `linear-gradient(to right, #ffd700 0%, #ff8c00 ${((panelData.level || 0)/25)*100}%, #d3d3d3 ${((panelData.level || 0)/25)*100}%)`
            }}
            onChange={handleSliderChange}
          />
          <div className="echo-level-value">{panelData.level}</div>
        </div>
      </div>
      
      <StatsTab panelId={`panel${index}`} cost={echo?.cost ?? null} stats={panelData.stats} onMainStatChange={onMainStatChange} onSubStatChange={onSubStatChange}/>
      <button className="clear-button" onClick={onReset}> Reset </button>
      {echo?.name && PHANTOM_ECHOES.includes(echo.name) && (
        <div className="phantom-container">
          <input type="checkbox"
            id={`phantom-${index}`}
            checked={panelData.phantom}
            onChange={(e) => onPhantomChange(e.target.checked)}
          />
          <label htmlFor={`phantom-${index}`}>
            Phantom
          </label>
        </div>
      )}
      <div className="panel-actions">
        <button 
          className={`action-button save ${isSaved ? 'saved' : ''}`} 
          onClick={handleSave} 
          disabled={!panelData.id}
        >
          {isSaved ? 'Saved!' : 'Save'}
        </button>
        <button className="action-button load" onClick={onLoad}>
          Load
        </button>
      </div>
    </div>
  );
};

export const EchoesSection = ({ 
  isVisible,
  isMinimized,
  onMinimize,
  onPanelChange, 
  initialPanels,
  onLevelChange,
  onElementSelect,
  onEchoSelect,
  onMainStatChange,
  onSubStatChange,
  savedEchoes = [],
  onSaveEcho,
  onLoadEcho,
  onDeleteEcho,
  showCostWarning,
  onCostWarningDismiss,
  containerRef
}: EchoesSectionProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPanelIndex, setSelectedPanelIndex] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [selectedLoadPanelIndex, setSelectedLoadPanelIndex] = useState<number | null>(null);
  
  const panels = initialPanels;

  useModalClose(isModalOpen, () => setIsModalOpen(false));
  useModalClose(isLoadModalOpen, () => setIsLoadModalOpen(false));

  const handleReset = useCallback((index: number) => {
    onPanelChange?.(panels.map((panel, i) => 
      i === index ? {
        id: null,
        level: 0,
        selectedElement: null,
        stats: {
          mainStat: { type: null, value: null },
          subStats: Array(5).fill(null).map(() => ({ type: null, value: null }))
        },
        phantom: false
      } : panel
    ));
  }, [panels, onPanelChange]);

  const handleLevelChange = useCallback((index: number, level: number) => {
    onLevelChange?.(index, level);
  }, [onLevelChange]);
  
  const handleElementSelect = useCallback((index: number, element: ElementType | null) => {
    onElementSelect?.(index, element);
  }, [onElementSelect]);

  const handleSelectEcho = useCallback((echo: Echo) => {
    if (selectedPanelIndex === null) return;
    
    const totalCost = panels.reduce((sum, panel, index) => {
      const currentEcho = index === selectedPanelIndex ? 
        echo : 
        getCachedEchoes(panel.id);
      return sum + (currentEcho?.cost || 0);
    }, 0);

    if (totalCost > 12) {
      setShowWarning(true);
      return;
    }

    const hasPhantom = PHANTOM_ECHOES.includes(echo.name);
    onEchoSelect?.(selectedPanelIndex, echo.id);
    onPanelChange?.(panels.map((panel, i) => 
      i === selectedPanelIndex ? {
        ...panel,
        id: echo.id,
        phantom: hasPhantom
      } : panel
    ));
    setIsModalOpen(false);
  }, [selectedPanelIndex, panels, onEchoSelect, onPanelChange]);

  const handleMinimize = () => {
    if (isMinimized) {
      containerRef?.current?.scrollIntoView({ 
        behavior: 'smooth' 
      });
    }
    onMinimize();
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = parseInt(active.id.toString().split('-')[1]);
      const newIndex = parseInt(over.id.toString().split('-')[1]);
      
      onPanelChange?.(arrayMove(panels, oldIndex, newIndex));
    }
  }, [panels, onPanelChange]);

  return (
    <div className={`echo-section${isVisible ? ' visible' : ''}`}>
      <div className={`echoes-tab${isVisible ? ' visible' : ''}`} ref={containerRef}>
        {isVisible && (
          <>
            <button onClick={handleMinimize} className="echoes-header with-chevron">
              Echoes Info
              {isMinimized ? <ChevronLeft size={20} /> : <ChevronDown size={20} />}
            </button>
            <div className={`echoes-content${isMinimized ? '' : ' open'}`}>
              {!isMinimized && (
                <>
                  {showWarning && (
                    <div onClick={() => setShowWarning(false)}>
                      <span className="popuptext show">
                        Warning: Echo Cost exceeds limit
                        <br/>
                        <span>Click to dismiss</span>
                      </span>
                    </div>
                  )}
                  
                  {showCostWarning && (
                    <div onClick={onCostWarningDismiss}>
                      <span className="popuptext show">
                        Warning: Echo Cost exceeds limit
                        <br/>
                        <span>Click to dismiss</span>
                      </span>
                    </div>
                  )}

                  <div className="echo-panels-container">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} >
                      <SortableContext items={panels.map((_, i) => `panel-${i}`)} strategy={horizontalListSortingStrategy}>
                        {panels.map((panel, i) => (
                          <SortableEchoPanel
                            key={`panel-${i}`}
                            id={`panel-${i}`}
                            index={i + 1}
                            panelData={panel}
                            onSelect={() => {
                              setSelectedPanelIndex(i);
                              setIsModalOpen(true);
                            }}
                            onReset={() => handleReset(i)}
                            onLevelChange={(level) => handleLevelChange(i, level)}
                            onElementSelect={(element) => handleElementSelect(i, element)}
                            onMainStatChange={(type) => onMainStatChange?.(i, type)}
                            onSubStatChange={(subIndex, type, value) => onSubStatChange?.(i, subIndex, type, value)}
                            onSave={() => onSaveEcho?.(i)}
                            onLoad={() => {
                              setSelectedLoadPanelIndex(i);
                              setIsLoadModalOpen(true);
                            }}
                            onPhantomChange={(value) => onPanelChange?.(panels.map((panel, idx) => 
                              idx === i ? { ...panel, phantom: value } : panel
                            ))}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {isModalOpen && (
          <div className="modal" data-id="echo-select-modal">
            <div className="echo-modal-content">
              <span className="close" onClick={() => setIsModalOpen(false)}>&times;</span>
              <div className="echo-list">
                {COST_SECTIONS.map((cost: CostSection) => {
                  const costEchoes = (cachedEchoes || [])
                    .filter(echo => echo.cost === cost)
                    .sort((a, b) => a.name.localeCompare(b.name));
                  return (
                    <div key={cost} className="echo-cost-section">
                      <div className="cost-label">{cost} Cost</div>
                      <div className="echo-grid">
                        {costEchoes.map(echo => (
                        <div key={echo.name} className="echo-option" onClick={() => handleSelectEcho(echo)}>
                          <img src={getAssetPath('echoes', echo as Echo).cdn} alt={echo.name} className="echo-img"/>
                        <span className="echo-name">{echo.name}</span>
                      </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {isLoadModalOpen && (
          <div className="modal" data-id="echo-load-modal">
            <div className="echo-modal-content">
              <span className="close" onClick={() => setIsLoadModalOpen(false)}>&times;</span>
              <div className="saved-echo-list">
                {savedEchoes.map(savedEcho => {
                  const panel = savedEcho.panelData;
                  const savedEchoData = getCachedEchoes(panel.id);
                  const stats = panel.stats;
                  const element = panel.selectedElement;
                  const mainStat = stats.mainStat.type;
                  const subStats = stats.subStats.map(sub => sub.type).filter(Boolean);
                  return (
                    <div key={savedEcho.id}
                      className="echo-option"
                      onClick={(e) => {
                        if (!(e.target as HTMLElement).closest('.delete-button')) {
                          if (selectedLoadPanelIndex !== null) {
                            onLoadEcho?.(savedEcho, selectedLoadPanelIndex);
                            setIsLoadModalOpen(false);
                          }
                        }
                      }}
                    >
                      <img src={savedEchoData ? getAssetPath('echoes', savedEchoData).cdn : '/images/Resources/Echo.png'} alt={savedEchoData?.name || 'Empty Echo'} className="echo-img"/>
                      <div className="echo-info">
                        <div className="echo-name">
                          {savedEchoData?.name || 'Empty Echo'}
                        </div>
                        <div className="echo-stats">
                          <div>{element} • {mainStat}</div>
                          <div>{subStats.slice(0, 3).join(' • ')}</div>
                          <div>{subStats.slice(3, 5).join(' • ')}</div>
                        </div>
                      </div>
                      <button 
                        className="delete-button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onDeleteEcho?.(savedEcho.id);
                        }}
                      >
                        X
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};