import React, { useState } from 'react';
import { DecompressedEntry, MoveResult } from '../Build/types';
import { cachedCharacters } from '../../hooks/useCharacters';
import { useSubstats } from '../../hooks/useSub';
import { 
    BuildEchoRow, 
    BuildBreakdownRow, 
    TotalBreakdown,
    getCharacterDefaultStats 
} from '../Build/BuildExpanded';

interface DamageExpandedProps {
    entry: DecompressedEntry;
    selectedWeapon: number;
}

const MoveBreakdown: React.FC<{
    moves: MoveResult[];
    totalDamage: number;
}> = ({ moves, totalDamage }) => {
    const movePercentages = moves.map(move => ({
        ...move,
        percentage: (move.damage / totalDamage) * 100
    }));

    // Split moves into two columns
    const midPoint = Math.ceil(movePercentages.length / 2);
    const leftMoves = movePercentages.slice(0, midPoint);
    const rightMoves = movePercentages.slice(midPoint);

    return (
        <div className="moves-breakdown">
            <div className="moves-header">Rotation Breakdown</div>
            <div className="moves-grid">
                <div className="moves-column">
                    {leftMoves.map((move, index) => (
                        <div key={index} className="move-entry">
                            <div className="move-info">
                                <span className="move-name">{move.name}</span>
                                <span className="move-percentage">
                                    {move.percentage.toFixed(1)}%
                                </span>
                                <span className="move-damage">
                                    {move.damage.toLocaleString()}
                                </span>
                            </div>
                            <div className="move-bar-container">
                                <div 
                                    className="move-bar" 
                                    style={{ width: `${move.percentage}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="moves-column">
                    {rightMoves.map((move, index) => (
                        <div key={index} className="move-entry">
                            <div className="move-info">
                                <span className="move-name">{move.name}</span>
                                <span className="move-percentage">
                                    {move.percentage.toFixed(1)}%
                                </span>
                                <span className="move-damage">
                                    {move.damage.toLocaleString()}
                                </span>
                            </div>
                            <div className="move-bar-container">
                                <div 
                                    className="move-bar" 
                                    style={{ width: `${move.percentage}%` }}
                                />
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
    const { substatsData } = useSubstats();
    const [selectedStats, setSelectedStats] = useState<Set<string>>(() => 
        getCharacterDefaultStats(character)
    );

    return (
        <div className="build-expanded-content">
            <BuildEchoRow echoPanels={entry.buildState.echoPanels} substatsData={substatsData} selectedStats={selectedStats} />
            <div className="build-breakdown-container">
                <BuildBreakdownRow 
                    echoPanels={entry.buildState.echoPanels} 
                    selectedStats={selectedStats}
                    onToggleStat={(statName) => {
                        setSelectedStats(prev => {
                            const next = new Set(prev);
                            if (next.has(statName)) {
                                next.delete(statName);
                            } else {
                                next.add(statName);
                            }
                            return next;
                        });
                    }}
                />
                <TotalBreakdown echoPanels={entry.buildState.echoPanels} selectedStats={selectedStats} />
            </div>
            {selectedCalc?.moves && (
                <MoveBreakdown 
                    moves={selectedCalc.moves} 
                    totalDamage={selectedCalc.damage}
                />
            )}
        </div>
    );
};