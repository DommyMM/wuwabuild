import { useState, useEffect } from 'react';
import { Character, validateCharacter } from '../types/character';

export const useCharacters = () => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCharacters = async () => {
      try {
        const response = await fetch('/Data/Characters.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (!Array.isArray(data)) {
          throw new Error('Invalid data format: expected array');
        }

        const validCharacters = data.filter(char => {
          try {
            return validateCharacter(char);
          } catch {
            console.warn(`Invalid character data:`, char);
            return false;
          }
        });

        setCharacters(validCharacters);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load characters');
        console.error('Character loading error:', err);
      } finally {
        setLoading(false);
      }
    };
    loadCharacters();
  }, []);

  return { characters, loading, error };
};