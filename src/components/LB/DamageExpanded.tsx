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

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="move-tooltip">
                <div className="move-tooltip-name">{data.name}</div>
                <div className="move-tooltip-stats">
                    <span className="move-tooltip-damage">{data.damage.toLocaleString()}</span>
                    <span className="move-tooltip-percentage">({data.percentage.toFixed(1)}%)</span>
                </div>
                {data.isHit && (
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

/** Calculate move complexity score based on its structure */
function getMoveWeight(move: MoveResult): number {
    const baseWeight = 1;
    const hitCount = move.hits?.length ?? 0;
    const hitWeight = hitCount * 1.5; // Hits are weighted more heavily
    return baseWeight + hitWeight;
}

function getBalancedColumns(moves: MoveResult[]): [MoveResult[], MoveResult[], 'left' | 'right' | null] {
    // 1) Attach metadata
    const weighted = moves.map((move, idx) => ({
        move,
        originalIndex: idx,
        weight: getMoveWeight(move)
    }));

    // 2) Sort descending by weight
    weighted.sort((a, b) => b.weight - a.weight);

    // 3) Greedy distribution by weight
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

    // 4) Sort each column back by originalIndex to maintain order
    left.sort((a, b) => a.originalIndex - b.originalIndex);
    right.sort((a, b) => a.originalIndex - b.originalIndex);

    const weightDifference = Math.abs(leftWeight - rightWeight);
    const shouldShift = weightDifference >= 1;
    
    // Determine which column is heavier and needs its last item shifted
    const shiftDirection = shouldShift ? (leftWeight > rightWeight ? 'right' : 'left') : null;

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

const LegendColumn: React.FC<{
    moves: MoveResult[];
    totalDamage: number;
    activeIndex: number | null;
    hitData: any[];
    allMoves: MoveResult[];
    setActiveIndex: (index: number | null) => void;
    setActiveHitIndex: (index: number | null) => void;
    position: ColumnPosition; 
}> = ({ moves, totalDamage, activeIndex, hitData, allMoves, setActiveIndex, setActiveHitIndex, position }) => (
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
                                    ({((move.damage / totalDamage) * 100).toFixed(1)}%)
                                </span>
                            </div>
                        </div>
                        {move.hits && move.hits.length > 0 && (
                            <div className="legend-hits">
                                {move.hits.map((hit, hitIndex) => {
                                    const hitGlobalIndex = hitData.findIndex(
                                        (h: any) => h.parentMove === move.name && h.name === hit.name
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

const MoveLegend: React.FC<{
    moves: MoveResult[];
    totalDamage: number;
    activeIndex: number | null;
    hitData: any[];
    setActiveIndex: (index: number | null) => void;
    setActiveHitIndex: (index: number | null) => void;
}> = ({ moves, totalDamage, activeIndex, hitData, setActiveIndex, setActiveHitIndex }) => {
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

const MoveBreakdown: React.FC<{
    moves: MoveResult[];
    totalDamage: number;
}> = ({ moves, totalDamage }) => {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [activeHitIndex, setActiveHitIndex] = useState<number | null>(null);

    // Format move data for the main pie (inner ring)
    const moveData = moves.map(move => ({
        name: move.name,
        damage: move.damage,
        value: move.damage,
        percentage: (move.damage / totalDamage) * 100
    }));

    // Format hit data for the outer ring, flattening all hits
    const hitData = moves.flatMap((move, moveIndex) => {
        if (move.hits && move.hits.length > 0) {
            // For moves with hits, show each individual hit
            return move.hits.map(hit => ({
                name: hit.name,
                damage: hit.damage,
                value: hit.damage,
                percentage: hit.percentage,
                parentMove: move.name,
                parentIndex: moveIndex,
                isHit: true
            }));
        }
        // For moves without hits, show the total move as one segment
        return [{
            name: move.name,
            damage: move.damage,
            value: move.damage,
            percentage: (move.damage / totalDamage) * 100,
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
                    moves={moves}
                    totalDamage={totalDamage}
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
                <MoveBreakdown 
                    moves={sequenceData.moves} 
                    totalDamage={sequenceData.damage} 
                />
            )}
        </div>
    );
};