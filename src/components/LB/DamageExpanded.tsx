import React from 'react';
import { DecompressedEntry, MoveResult } from '../Build/types';
import { cachedCharacters } from '../../hooks/useCharacters';
import { BuildExpanded } from '../Build/BuildExpanded';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface DamageExpandedProps {
    entry: DecompressedEntry;
    selectedWeapon: number;
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
                <div className="move-tooltip-damage">{data.damage.toLocaleString()}</div>
                <div className="move-tooltip-percentage">{data.percentage.toFixed(1)}%</div>
            </div>
        );
    }
    return null;
};

const MoveBreakdown: React.FC<{
    moves: MoveResult[];
    totalDamage: number;
}> = ({ moves, totalDamage }) => {
    const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

    const data = moves.map(move => ({
        name: move.name,
        damage: move.damage,
        value: move.damage,
        percentage: (move.damage / totalDamage) * 100
    }));

    return (
        <div className="moves-breakdown">
            <div className="moves-header">Damage Distribution</div>
            <div className="chart-section">
                <div className="chart-container">
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                dataKey="value"
                                labelLine={false}
                                onMouseEnter={(_, index) => setActiveIndex(index)}
                                onMouseLeave={() => setActiveIndex(null)}
                            >
                                {data.map((_, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                        opacity={activeIndex === index ? 1 : 0.85} 
                                        stroke={activeIndex === index ? '#fff' : 'none'}
                                    />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="moves-legend">
                    {data.map((move, index) => (
                        <div 
                            key={index} 
                            className={`legend-item ${activeIndex === index ? 'active' : ''}`}
                            onMouseEnter={() => setActiveIndex(index)}
                            onMouseLeave={() => setActiveIndex(null)}
                        >
                            <div 
                                className="legend-color" 
                                style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                            />
                            <div className="legend-details">
                                <span className="legend-name">{move.name}</span>
                                <span className="legend-stats">
                                    {move.damage.toLocaleString()} ({move.percentage.toFixed(1)}%)
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const DamageExpanded: React.FC<DamageExpandedProps> = ({ 
    entry,
    selectedWeapon
}) => {
    const character = entry.buildState.characterState.id ? 
        cachedCharacters?.find(c => c.id === entry.buildState.characterState.id) ?? null : null;
    
    const selectedCalc = entry.calculations?.[selectedWeapon];

    return (
        <div className="build-expanded-content">
            <BuildExpanded echoPanels={entry.buildState.echoPanels} character={character} />
            {selectedCalc?.moves && (
                <MoveBreakdown moves={selectedCalc.moves} totalDamage={selectedCalc.damage} />
            )}
        </div>
    );
};