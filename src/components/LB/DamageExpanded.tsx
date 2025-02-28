import React, { useState } from 'react';
import { DecompressedEntry, MoveResult, Sequence } from '../Build/types';
import { cachedCharacters } from '../../hooks/useCharacters';
import { BuildExpanded } from '../Build/BuildExpanded';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface DamageExpandedProps {
    entry: DecompressedEntry;
    selectedWeapon: number;
    selectedSequence?: Sequence;
}

interface ChartMoveData {
    name: string;
    damage: number;
    value: number;
    percentage: number;
}

interface ChartHitData {
    name: string;
    damage: number;
    value: number;
    percentage: number;
    parentMove: string;
    parentIndex: number;
    isHit: boolean;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
        payload: ChartMoveData | ChartHitData;
    }>;
}

const COLORS = [
    '#a69662', // Our gold for primary move
    '#ff6b6b', // Coral red
    '#4ecdc4', // Turquoise
    '#9d65c9', // Lavender
    '#5d9cec', // Sky blue
    '#f5d76e', // Warm yellow
    '#95a5a6', // Cool gray
    '#2ecc71'  // Emerald
];

function isChartHitData(data: ChartMoveData | ChartHitData): data is ChartHitData {
    return 'isHit' in data;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="move-tooltip">
                <div className="move-tooltip-name">{data.name}</div>
                <div className="move-tooltip-stats">
                    <span className="move-tooltip-damage">{data.damage.toLocaleString()}</span>
                    <span className="move-tooltip-percentage">({data.percentage.toFixed(1)}%)</span>
                </div>
                {isChartHitData(data) && data.isHit && (
                    <div className="move-tooltip-parent">
                        Part of: {data.parentMove}
                    </div>
                )}
            </div>
        );
    }
    return null;
};

const DamageChart: React.FC<{
    moveData: ChartMoveData[];
    hitData: ChartHitData[];
    activeIndex: number | null;
    activeHitIndex: number | null;
    setActiveIndex: (index: number | null) => void;
    setActiveHitIndex: (index: number | null) => void;
}> = ({ moveData, hitData, activeIndex, activeHitIndex, setActiveIndex, setActiveHitIndex }) => (
    <div className="chart-container">
        <ResponsiveContainer width="100%" height={400}>
            <PieChart>
                <Pie
                    data={moveData}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={120}
                    dataKey="value"
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                >
                    {moveData.map((entry, index) => (
                        <Cell
                            key={`move-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            opacity={activeIndex === index ? 1 : 0.85}
                            stroke={activeIndex === index ? '#fff' : 'none'}
                        />
                    ))}
                </Pie>
                <Pie
                    data={hitData}
                    cx="50%"
                    cy="50%"
                    innerRadius={125}
                    outerRadius={170}
                    dataKey="value"
                    onMouseEnter={(_, index) => setActiveHitIndex(index)}
                    onMouseLeave={() => setActiveHitIndex(null)}
                >
                    {hitData.map((entry, index) => (
                        <Cell
                            key={`hit-${index}`}
                            fill={COLORS[entry.parentIndex % COLORS.length]}
                            opacity={entry.isHit ? 0.7 : 0.85}
                            stroke={activeHitIndex === index ? '#fff' : 'none'}
                        />
                    ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
            </PieChart>
        </ResponsiveContainer>
    </div>
);

/** Calculate move complexity score based on its structure and content */
function getBalancedColumns(moves: MoveResult[]): [MoveResult[], MoveResult[], 'left' | 'right' | null] {
    if (moves.length <= 1) {
        return [moves, [], null];
    }
    
    // Find any extremely complex item (with 6+ hits)
    const complexItems = moves.filter(move => (move.hits?.length ?? 0) >= 6);
    
    // Special case: If we have one very complex item, isolate it in left column
    if (complexItems.length === 1) {
        const complexItem = complexItems[0];
        const remainingItems = moves.filter(move => move !== complexItem);
        // If this is our only complex item, put it in left column with at most one other item
        const left = [complexItem];
        let simpleItem = null;
        
        if (remainingItems.length > 0) {
            // Add one simple item to the left column to visually balance it slightly
            simpleItem = remainingItems.find(move => !move.hits || move.hits.length === 0);
            if (simpleItem) {
                left.push(simpleItem);
            }
        }
        
        // Put the rest in the right column
        const right = remainingItems.filter(move => move !== simpleItem);
        
        const leftWeight = left.reduce((sum, m) => sum + 1 + ((m.hits?.length ?? 0) * 2), 0);
        const rightWeight = right.reduce((sum, m) => sum + 1 + ((m.hits?.length ?? 0) * 2), 0);
        const weightDifference = Math.abs(leftWeight - rightWeight);
        
        // Simpler shifting logic - shift if difference is substantial
        const shouldShift = weightDifference > 6 && left.length > 0 && right.length > 0;
        
        // If left is heavier, shift left. If right is heavier, shift right.
        const shiftDirection = shouldShift ? (leftWeight > rightWeight ? 'left' : 'right') : null;
        return [left, right, shiftDirection];
    }
    // Normal case: Use weight-based balancing (keeping this as a fallback)    
    // Calculate weights with extra emphasis on hit count
    const weighted = moves.map((move, idx) => ({
        move,
        originalIndex: idx,
        weight: 1 + ((move.hits?.length ?? 0) * 2)
    }));
    
    // Sort by weight for better initial distribution
    weighted.sort((a, b) => b.weight - a.weight);
    
    // Greedy distribution by weight
    const left: typeof weighted = [];
    const right: typeof weighted = [];
    let leftWeight = 0, rightWeight = 0;
    
    for (const item of weighted) {
        if (leftWeight <= rightWeight) {
            left.push(item);
            leftWeight += item.weight;
        } else {
            right.push(item);
            rightWeight += item.weight;
        }
    }
    
    // Sort each column back by originalIndex
    left.sort((a, b) => a.originalIndex - b.originalIndex);
    right.sort((a, b) => a.originalIndex - b.originalIndex);
    
    // Simpler shifting logic - shift if difference is substantial
    const weightDifference = Math.abs(leftWeight - rightWeight);
    const shouldShift = weightDifference > 6 && left.length > 0 && right.length > 0;
    
    // If left is heavier, shift left. If right is heavier, shift right.
    const shiftDirection = shouldShift ? (leftWeight > rightWeight ? 'left' : 'right') : null;
    
    return [
        left.map(x => x.move),
        right.map(x => x.move),
        shiftDirection
    ];
}

type ColumnPosition = {
    side: 'left' | 'right';
    shouldShiftLast: boolean;
};

interface LegendColumnProps {
    moves: MoveResult[];
    totalDamage: number;
    activeIndex: number | null;
    hitData: ChartHitData[];
    allMoves: MoveResult[];
    setActiveIndex: (index: number | null) => void;
    setActiveHitIndex: (index: number | null) => void;
    position: ColumnPosition;
}

const LegendColumn: React.FC<LegendColumnProps> = ({ moves, totalDamage, activeIndex, hitData, allMoves, setActiveIndex, setActiveHitIndex, position }) => (
    <div className={`legend-column ${position.side}${position.shouldShiftLast ? ' shift-last' : ''}`}>
        {moves.map((move) => {
            const globalIndex = allMoves.indexOf(move);
            return (
                <div key={globalIndex}
                    className={`legend-item ${activeIndex === globalIndex ? 'active' : ''}`}
                    onMouseEnter={() => setActiveIndex(globalIndex)}
                    onMouseLeave={() => setActiveIndex(null)}
                >
                    <div className="legend-content">
                        <div className="legend-main-row">
                            <div className="legend-name-section">
                                <div className="legend-color" style={{ backgroundColor: COLORS[globalIndex % COLORS.length] }}/>
                                <span className="legend-name">{move.name}</span>
                            </div>
                            <div className="legend-stats">
                                <span className="legend-damage">{move.damage.toLocaleString()}</span>
                                <span className="legend-percentage">
                                    {((move.damage / totalDamage) * 100).toFixed(1)}%
                                </span>
                            </div>
                        </div>
                        {move.hits && move.hits.length > 0 && (
                            <div className="legend-hits">
                                {move.hits.map((hit, hitIndex) => {
                                    const hitGlobalIndex = hitData.findIndex(
                                        (h: ChartHitData) => h.parentMove === move.name && h.name === hit.name
                                    );
                                    return (
                                        <div
                                            key={hitIndex}
                                            className="legend-hit-item"
                                            onMouseEnter={() => setActiveHitIndex(hitGlobalIndex)}
                                            onMouseLeave={() => setActiveHitIndex(null)}
                                        >
                                            <span className="hit-name">• {hit.name}</span>
                                            <span className="hit-damage">
                                                {hit.damage.toLocaleString()} ({hit.percentage.toFixed(1)}%)
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            );
        })}
    </div>
);

interface MoveLegendProps {
    moves: MoveResult[];
    totalDamage: number;
    activeIndex: number | null;
    hitData: ChartHitData[];
    setActiveIndex: (index: number | null) => void;
    setActiveHitIndex: (index: number | null) => void;
}

const MoveLegend: React.FC<MoveLegendProps> = ({ moves, totalDamage, activeIndex, hitData, setActiveIndex, setActiveHitIndex }) => {
    const [leftColumn, rightColumn, shiftDirection] = getBalancedColumns(moves);

    return (
        <div className="moves-legend">
            <div className="legend-grid">
                <LegendColumn
                    moves={leftColumn}
                    totalDamage={totalDamage}
                    activeIndex={activeIndex}
                    hitData={hitData}
                    allMoves={moves}
                    setActiveIndex={setActiveIndex}
                    setActiveHitIndex={setActiveHitIndex}
                    position={{ 
                        side: 'left',
                        shouldShiftLast: shiftDirection === 'left'
                    }}
                />
                <LegendColumn
                    moves={rightColumn}
                    totalDamage={totalDamage}
                    activeIndex={activeIndex}
                    hitData={hitData}
                    allMoves={moves}
                    setActiveIndex={setActiveIndex}
                    setActiveHitIndex={setActiveHitIndex}
                    position={{ 
                        side: 'right',
                        shouldShiftLast: shiftDirection === 'right'
                    }}
                />
            </div>
        </div>
    );
};

function processMoveData(moves: MoveResult[]) {
    // Group moves by name
    const moveGroups: Record<string, MoveResult[]> = {};
    
    moves.forEach(move => {
        if (!moveGroups[move.name]) {
            moveGroups[move.name] = [];
        }
        moveGroups[move.name].push(move);
    });
    
    // Create combined moves for visualization
    const combinedMoves: MoveResult[] = [];
    const originalToProcessed = new Map<MoveResult, MoveResult>();
    
    Object.entries(moveGroups).forEach(([name, instances]) => {
        if (instances.length === 1) {
            // Single instance, keep as is
            combinedMoves.push(instances[0]);
            originalToProcessed.set(instances[0], instances[0]);
        } else {
            // Sort by damage (descending)
            instances.sort((a, b) => b.damage - a.damage);
            
            // Create combined move
            const combinedMove: MoveResult = {
                ...instances[0],
                name,
                damage: instances.reduce((sum, move) => sum + move.damage, 0),
                // If hits exist, combine them too
                hits: instances[0].hits ? instances.flatMap((move, idx) => 
                    move.hits?.map(hit => ({
                        ...hit,
                        name: `${hit.name} ${idx === 0 ? '(Buffed)' : '(Unbuffed)'}`,
                        damage: hit.damage,
                        percentage: (hit.damage / instances.reduce((sum, m) => sum + m.damage, 0)) * 100
                    })) || []
                ) : undefined
            };
            
            combinedMoves.push(combinedMove);
            
            // Map all original moves to this combined one
            instances.forEach(original => {
                originalToProcessed.set(original, combinedMove);
            });
        }
    });
    
    return { combinedMoves, originalToProcessed };
}

const MoveBreakdown: React.FC<{
    moves: MoveResult[];
}> = ({ moves }) => {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [activeHitIndex, setActiveHitIndex] = useState<number | null>(null);
    
    // Process and combine duplicate moves
    const { combinedMoves } = processMoveData(moves);
    
    // Recalculate total damage based on combined moves
    const combinedTotalDamage = combinedMoves.reduce((sum, move) => sum + move.damage, 0);
    
    // Format move data for the main pie (inner ring)
    const moveData = combinedMoves.map(move => ({
        name: move.name,
        damage: move.damage,
        value: move.damage,  // Value directly drives the angle
        percentage: (move.damage / combinedTotalDamage) * 100
    }));

    // For each move, calculate the total damage of its hits
    const moveTotals = new Map<string, number>();
    combinedMoves.forEach(move => {
        if (move.hits && move.hits.length > 0) {
            moveTotals.set(move.name, move.hits.reduce((sum, hit) => sum + hit.damage, 0));
        }
    });

    const hitData = combinedMoves.flatMap((move, moveIndex) => {
        if (move.hits && move.hits.length > 0) {
            // Get total of all hits for this move
            const totalHitDamage = moveTotals.get(move.name) || 0;
            
            // For each hit, calculate its proportion of the parent move's angle
            return move.hits.map(hit => {
                // Calculate what fraction of the move's total angle this hit should occupy
                const hitFraction = hit.damage / totalHitDamage;
                
                return {
                    name: hit.name,
                    damage: hit.damage,
                    // Scale the value proportionally to the parent move's value
                    value: move.damage * hitFraction,
                    percentage: hit.percentage,
                    parentMove: move.name,
                    parentIndex: moveIndex,
                    isHit: true
                };
            });
        }
        // For moves without hits, show the total move as one segment
        return [{
            name: move.name,
            damage: move.damage,
            value: move.damage,
            percentage: (move.damage / combinedTotalDamage) * 100,
            parentMove: move.name,
            parentIndex: moveIndex,
            isHit: false
        }];
    });

    return (
        <div className="moves-breakdown">
            <div className="chart-section">
                <DamageChart
                    moveData={moveData}
                    hitData={hitData}
                    activeIndex={activeIndex}
                    activeHitIndex={activeHitIndex}
                    setActiveIndex={setActiveIndex}
                    setActiveHitIndex={setActiveHitIndex}
                />
                <MoveLegend
                    moves={combinedMoves}
                    totalDamage={combinedTotalDamage}
                    activeIndex={activeIndex}
                    hitData={hitData}
                    setActiveIndex={setActiveIndex}
                    setActiveHitIndex={setActiveHitIndex}
                />
            </div>
        </div>
    );
};

export const DamageExpanded: React.FC<DamageExpandedProps> = ({ 
    entry,
    selectedWeapon,
    selectedSequence = 's0'  // Default to s0
}) => {
    const expandedRef = React.useRef<HTMLDivElement>(null);
    
    React.useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (expandedRef.current) {
                const elementPosition = expandedRef.current.getBoundingClientRect().top;
                window.scrollTo({
                    top: window.scrollY + elementPosition - 200,
                    behavior: 'smooth'
                });
            }
        }, 100);
    
        return () => clearTimeout(timeoutId);
    }, []);

    const character = entry.buildState.characterState.id ? 
        cachedCharacters?.find(c => c.id === entry.buildState.characterState.id) ?? null : null;
    
    // Update calculation access to use sequence
    const selectedCalc = entry.calculations?.[selectedWeapon];
    const sequenceData = selectedCalc?.[selectedSequence];

    return (
        <div className="build-expanded-content" ref={expandedRef}>
            <BuildExpanded echoPanels={entry.buildState.echoPanels} character={character} />
            {sequenceData && (
                <MoveBreakdown moves={sequenceData.moves} />
            )}
        </div>
    );
};