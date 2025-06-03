import React, { useState } from 'react';
import { DecompressedEntry, MoveResult } from '../Build/types';
import { cachedCharacters } from '@/hooks/useCharacters';
import { BuildExpanded } from '@/components/Build/BuildExpanded';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { StatUpgrades } from './SubstatUpgrades';

interface DamageExpandedProps {
    entry: DecompressedEntry;
    selectedWeapon: number;
    selectedSequence?: string;
    moveCache?: Map<string, MoveResult[]>;
    loadingMoves?: Set<string>;
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

/** Calculate move visual heights and balance columns by actual rendered height */
function getBalancedColumns(moves: MoveResult[]): [MoveResult[], MoveResult[], 'left' | 'right' | null] {
    if (moves.length <= 1) {
        return [moves, [], null];
    }
    
    // Calculate actual visual heights: Base 55px + first 2 hits (38.5px) + remaining hits (32px)
    const calculateMoveHeight = (move: MoveResult): number => {
        const BASE_HEIGHT = 55;
        const hitCount = move.hits?.length ?? 0;
        const hitHeight = Math.min(hitCount, 2) * 38.5 + Math.max(0, hitCount - 2) * 32;
        return BASE_HEIGHT + hitHeight;
    };
    
    const movesWithHeight = moves.map((move, idx) => ({
        move,
        originalIndex: idx,
        height: calculateMoveHeight(move)
    }));
    
    const totalHeight = movesWithHeight.reduce((sum, item) => sum + item.height, 0);
    const targetHeight = totalHeight / 2;
    
    // Quick check: Do we have the problematic "multiple similar heights" pattern?
    const heights = movesWithHeight.map(m => m.height);
    const heightCounts = new Map();
    heights.forEach(h => heightCounts.set(h, (heightCounts.get(h) || 0) + 1));
    const hasMultipleSimilar = Array.from(heightCounts.values()).some(count => count >= 3);
    
    // If problematic pattern + small dataset, use DP
    if (hasMultipleSimilar && moves.length <= 10) {
        const dpResult = solveWithDP(movesWithHeight, Math.floor(targetHeight));
        if (dpResult) {
            const { left, right } = dpResult;
            left.sort((a, b) => a.originalIndex - b.originalIndex);
            right.sort((a, b) => a.originalIndex - b.originalIndex);
            
            const finalLeftHeight = left.reduce((sum, item) => sum + item.height, 0);
            const finalRightHeight = right.reduce((sum, item) => sum + item.height, 0);
            const heightDifference = Math.abs(finalLeftHeight - finalRightHeight);
            const shiftDirection = heightDifference > 40 && left.length > 0 && right.length > 0 
                ? (finalLeftHeight > finalRightHeight ? 'left' : 'right') : null;
            
            return [left.map(x => x.move), right.map(x => x.move), shiftDirection];
        }
    }
    
    // Identify heavyweight moves (>200px or >35% of total)
    const heavyweights = movesWithHeight.filter(item => 
        item.height > 200 || item.height > totalHeight * 0.35
    );
    
    // Special case: If we have exactly one heavyweight, isolate it with small items
    if (heavyweights.length === 1) {
        const heavyweight = heavyweights[0];
        const others = movesWithHeight.filter(item => item !== heavyweight);
        
        const left = [heavyweight];
        const right = [...others];
        let leftHeight = heavyweight.height;
        
        others.sort((a, b) => a.height - b.height);
        
        for (const item of others) {
            const newLeftHeight = leftHeight + item.height;
            const remainingRightHeight = totalHeight - newLeftHeight;
            
            const currentDiff = Math.abs(leftHeight - (totalHeight - leftHeight));
            const newDiff = Math.abs(newLeftHeight - remainingRightHeight);
            
            if (newDiff < currentDiff && newLeftHeight <= targetHeight * 1.2) {
                left.push(item);
                leftHeight = newLeftHeight;
                const rightIndex = right.indexOf(item);
                right.splice(rightIndex, 1);
            }
        }
        
        left.sort((a, b) => a.originalIndex - b.originalIndex);
        right.sort((a, b) => a.originalIndex - b.originalIndex);
        
        const finalLeftHeight = left.reduce((sum, item) => sum + item.height, 0);
        const finalRightHeight = right.reduce((sum, item) => sum + item.height, 0);
        const heightDifference = Math.abs(finalLeftHeight - finalRightHeight);
        const shiftDirection = heightDifference > 40 && left.length > 0 && right.length > 0 
            ? (finalLeftHeight > finalRightHeight ? 'left' : 'right') : null;
        
        return [left.map(x => x.move), right.map(x => x.move), shiftDirection];
    }
    
    // Fallback: Use dynamic programming for optimal split
    let bestLeft: typeof movesWithHeight = [];
    let bestRight: typeof movesWithHeight = [];
    let bestDifference = Infinity;
    
    for (let splitPoint = 1; splitPoint < moves.length; splitPoint++) {
        const left = movesWithHeight.slice(0, splitPoint);
        const right = movesWithHeight.slice(splitPoint);
        
        const leftHeight = left.reduce((sum, item) => sum + item.height, 0);
        const rightHeight = right.reduce((sum, item) => sum + item.height, 0);
        const difference = Math.abs(leftHeight - rightHeight);
        
        if (difference < bestDifference) {
            bestDifference = difference;
            bestLeft = left;
            bestRight = right;
        }
    }
    
    // Try one optimization: move smallest item from heavier side to lighter side
    const leftHeight = bestLeft.reduce((sum, item) => sum + item.height, 0);
    const rightHeight = bestRight.reduce((sum, item) => sum + item.height, 0);
    
    if (Math.abs(leftHeight - rightHeight) > 50) {
        if (leftHeight > rightHeight && bestLeft.length > 1) {
            const smallest = bestLeft.reduce((min, item) => item.height < min.height ? item : min);
            bestLeft = bestLeft.filter(item => item !== smallest);
            bestRight = [...bestRight, smallest];
        } else if (rightHeight > leftHeight && bestRight.length > 1) {
            const smallest = bestRight.reduce((min, item) => item.height < min.height ? item : min);
            bestRight = bestRight.filter(item => item !== smallest);
            bestLeft = [...bestLeft, smallest];
        }
    }
    
    bestLeft.sort((a, b) => a.originalIndex - b.originalIndex);
    bestRight.sort((a, b) => a.originalIndex - b.originalIndex);
    
    const finalLeftHeight = bestLeft.reduce((sum, item) => sum + item.height, 0);
    const finalRightHeight = bestRight.reduce((sum, item) => sum + item.height, 0);
    const heightDifference = Math.abs(finalLeftHeight - finalRightHeight);
    const shiftDirection = heightDifference > 40 && bestLeft.length > 0 && bestRight.length > 0 
        ? (finalLeftHeight > finalRightHeight ? 'left' : 'right') : null;
    
    return [bestLeft.map(x => x.move), bestRight.map(x => x.move), shiftDirection];
}

// Simple DP solver for edge cases
function solveWithDP(movesWithHeight: Array<{move: MoveResult, originalIndex: number, height: number}>, target: number) {
    const n = movesWithHeight.length;
    const dp = Array(target + 1).fill(false);
    dp[0] = true;
    
    const parent = Array(target + 1).fill(-1);
    const usedItems = Array(target + 1).fill(null);
    
    for (let i = 0; i < n; i++) {
        const height = movesWithHeight[i].height;
        for (let sum = target; sum >= height; sum--) {
            if (dp[sum - height] && !dp[sum]) {
                dp[sum] = true;
                parent[sum] = sum - height;
                usedItems[sum] = i;
            }
        }
    }
    
    let bestSum = 0;
    for (let sum = target; sum >= 0; sum--) {
        if (dp[sum]) { bestSum = sum; break; }
    }
    
    const leftIndices = new Set();
    let currentSum = bestSum;
    while (currentSum > 0 && usedItems[currentSum] !== null) {
        leftIndices.add(usedItems[currentSum]);
        currentSum = parent[currentSum];
    }
    
    const left = [], right = [];
    for (let i = 0; i < n; i++) {
        if (leftIndices.has(i)) left.push(movesWithHeight[i]);
        else right.push(movesWithHeight[i]);
    }
    
    return { left, right };
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
            
            // Check if damage values are very similar (within 1%)
            const areDamagesEqual = instances.every(move => 
                Math.abs(move.damage - instances[0].damage) / instances[0].damage < 0.01
            );
            
            if (areDamagesEqual) {
                // For identical moves, create one combined move with multiplier
                const totalDamage = instances.reduce((sum, move) => sum + move.damage, 0);
                const multiplier = instances.length;
                
                const combinedMove: MoveResult = {
                    ...instances[0],
                    name: `${name} ${multiplier > 1 ? `×${multiplier}` : ''}`,
                    damage: totalDamage,
                    // Keep original hit structure but adjust percentages
                    hits: instances[0].hits ? instances[0].hits.map(hit => ({
                        ...hit,
                        damage: hit.damage * multiplier,
                        percentage: hit.percentage // Percentages stay the same since identical
                    })) : undefined
                };
                
                combinedMoves.push(combinedMove);
                
                // Map all original moves to this combined one
                instances.forEach(original => {
                    originalToProcessed.set(original, combinedMove);
                });
            } else {
                // For different damage values (buffed vs unbuffed), keep original behavior
                const combinedMove: MoveResult = {
                    ...instances[0],
                    name,
                    damage: instances.reduce((sum, move) => sum + move.damage, 0),
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
        value: move.damage,
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
    selectedSequence = 's0',
    moveCache = new Map(),
    loadingMoves = new Set()
}) => {
    const expandedRef = React.useRef<HTMLDivElement>(null);
    
    // Generate cache key for this entry/weapon/sequence combination
    const cacheKey = `${entry._id}-${selectedWeapon}-${selectedSequence}`;
    const isLoadingMoves = loadingMoves.has(cacheKey);
    const cachedMoves = moveCache.get(cacheKey);
    
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
    
    return (
        <div className="build-expanded-content" ref={expandedRef}>
            <BuildExpanded echoPanels={entry.buildState.echoPanels} character={character} />
            <div className="build-breakdown-container">
                {isLoadingMoves ? (
                    <div className="moves-loading">Loading move breakdown...</div>
                ) : cachedMoves ? (
                    <MoveBreakdown moves={cachedMoves} />
                ) : null}
                
                <StatUpgrades
                    entry={entry}
                    selectedWeapon={selectedWeapon}
                    selectedSequence={selectedSequence}
                    character={character}
                />
            </div>
        </div>
    );
};