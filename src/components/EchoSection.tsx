import React, { useState, useCallback, forwardRef } from 'react';
import { ChevronLeft, ChevronDown } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Echo, ElementType, ELEMENT_SETS, EchoPanelState as PanelData, COST_SECTIONS, CostSection } from '../types/echo';
import { SavedEchoData } from '../types/SavedState';
import { useEchoes } from '../hooks/useEchoes';
import { useModalClose } from '../hooks/useModalClose';
import { StatsTab } from './StatsTab';
import '../styles/echoes.css';

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
        <div 
          className={`set-name-display ${elements[0].toLowerCase()}`}
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
  onEchoSelect?: (index: number, echo: Echo) => void;
  onMainStatChange?: (index: number, type: string | null) => void;
  onSubStatChange?: (index: number, subIndex: number, type: string | null, value: number | null) => void;
  onPanelChange?: (panels: PanelData[]) => void;
  savedEchoes?: SavedEchoData[];
  onSaveEcho?: (index: number) => void;
  onLoadEcho?: (savedEcho: SavedEchoData) => void;
  onDeleteEcho?: (echoId: string) => void;
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
  listener?: Record<string, any>;
  onSave?: () => void;
  onLoad?: () => void;
}

export const EchoPanel: React.FC<EchoPanelProps> = ({
  index,
  panelData,
  onSelect,
  onReset,
  onLevelChange,
  onElementSelect,
  onMainStatChange,
  onSubStatChange,
  listener,
  onSave,
  onLoad
}) => {

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    onLevelChange(value);
  };

  return (
    <div className="echo-panel" id={`panel${index}`}>
      <div className="manual-section">
        <p id="selectedEchoLabel" style={{ fontSize: '30px', textAlign: 'center' }}{...listener}>
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
            selectedElement={panelData.selectedElement}
          />
        )}
      </div>
      
      <div className="echo-level-container">
        <div className="echo-slider-group">
          <input
            type="range"
            min="0"
            max="25"
            value={panelData.level || 0}
            className="echo-slider"
            style={{
              background: `linear-gradient(to right, #ffd700 0%, #ff8c00 ${((panelData.level || 0)/25)*100}%, #d3d3d3 ${((panelData.level || 0)/25)*100}%)`
            }}
            onChange={handleSliderChange}
          />
          <div className="echo-level-value">{panelData.level}</div>
        </div>
      </div>
      
      <StatsTab
        panelId={`panel${index}`}
        cost={panelData.echo?.cost ?? null}
        level={panelData.level}
        stats={panelData.stats}
        onMainStatChange={onMainStatChange}
        onSubStatChange={onSubStatChange}
      />

      <button className="clear-button" onClick={onReset}>
        Reset
      </button>

      <div className="panel-actions">
        <button 
          className="action-button save"
          onClick={onSave}
          disabled={!panelData.echo}
        >
          Save
        </button>
        <button 
          className="action-button load"
          onClick={onLoad}
        >
          Load
        </button>
      </div>
    </div>
  );
};

const SortablePanel = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? transition : 'none',
    width: '17.5%',
    position: 'relative' as const,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 999 : 'auto'
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {React.cloneElement(children as React.ReactElement, { listener: listeners })}
    </div>
  );
};

export const EchoesSection = forwardRef<HTMLElement, EchoesSectionProps>(({ 
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
  onDeleteEcho
}, ref) => {
  const { echoesByCost, loading, error } = useEchoes();
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
        echo: null,
        level: 0,
        selectedElement: null,
        stats: {
          mainStat: { type: null, value: null },
          subStats: Array(5).fill(null).map(() => ({ type: null, value: null }))
        }
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
    
    const totalCost = panels.reduce((sum, panel, index) => 
      sum + (index === selectedPanelIndex ? echo.cost : (panel.echo?.cost || 0)), 0);

    if (totalCost > 12) {
      setShowWarning(true);
      return;
    }

    onEchoSelect?.(selectedPanelIndex, echo);
    setIsModalOpen(false);
  }, [selectedPanelIndex, panels, onEchoSelect]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = parseInt(active.id.toString().replace('panel-', ''));
      const newIndex = parseInt(over.id.toString().replace('panel-', ''));
      
      const newPanels = arrayMove(initialPanels, oldIndex, newIndex);
      onPanelChange?.(newPanels);
    }
  };

  const handleMinimize = () => {
    if (isMinimized) {
      (ref as React.RefObject<HTMLElement>)?.current?.scrollIntoView({ 
        behavior: 'smooth' 
      });
    }
    onMinimize();
  };

  return (
    <section className={`echoes-tab${isVisible ? ' visible' : ''}`} ref={ref}>
      {isVisible && (
        <>
          <button 
            onClick={handleMinimize}
            className="echoes-header with-chevron"
          >
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
                
                <DndContext 
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext 
                    items={initialPanels.map((_, i) => `panel-${i}`)}
                    strategy={horizontalListSortingStrategy}
                  >
                    <div className="echo-panels-container">
                      {panels.map((panel, i) => (
                        <SortablePanel key={`panel-${i}`} id={`panel-${i}`}>
                          <EchoPanel
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
                          />
                        </SortablePanel>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </>
            )}
          </div>
        </>
      )}
  
      {isModalOpen && (
        <div className="modal" data-testid="echo-select-modal">
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

      {isLoadModalOpen && (
        <div className="modal" data-testid="echo-load-modal">
          <div className="echo-modal-content">
            <span className="close" onClick={() => setIsLoadModalOpen(false)}>&times;</span>
            <div className="saved-echo-list">
              {savedEchoes.map(savedEcho => {
                const echo = savedEcho.panelData;
                const stats = echo.stats;
                const element = echo.selectedElement;
                const mainStat = stats.mainStat.type;
                const subStats = stats.subStats.map(sub => sub.type).filter(Boolean);
                
                return (
                  <div 
                    key={savedEcho.id}
                    className="echo-option"
                    onClick={(e) => {
                      if (!(e.target as HTMLElement).closest('.delete-button')) {
                        if (selectedLoadPanelIndex !== null) {
                          onLoadEcho?.({
                            ...savedEcho,
                            panelIndex: selectedLoadPanelIndex
                          });
                        }
                        setIsLoadModalOpen(false);
                      }
                    }}
                  >
                    <img
                      src={echo.echo ? 
                        `images/Echoes/${echo.echo.name}.png` : 
                        'images/Resources/Echo.png'
                      }
                      alt={echo.echo?.name || 'Empty Echo'}
                      className="echo-img"
                    />
                    <div className="echo-info">
                      <div className="echo-name">
                        {echo.echo?.name || 'Empty Echo'}
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
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
});

export type { PanelData, ElementType };