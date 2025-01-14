import { useState, useEffect } from 'react';
import { Character, validateCharacter } from '../types/character';

export let cachedCharacters: Character[] | null = null;
export let loadError: string | null = null;

export const useCharacters = () => {
  const [characters, setCharacters] = useState<Character[]>(cachedCharacters || []);
  const [loading, setLoading] = useState(!cachedCharacters);
  const [error, setError] = useState<string | null>(loadError);
  useEffect(() => {
    if (cachedCharacters) return;
    const loadCharacters = async () => {
      try {
        const response = await fetch('/Data/Characters.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Invalid data format');
        const validCharacters = data.filter(validateCharacter);
        cachedCharacters = validCharacters;
        
        setCharacters(validCharacters);
        setLoading(false);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load characters';
        loadError = errorMsg;
        setError(errorMsg);
        setLoading(false);
      }
    };
    loadCharacters();
  }, []);
  return { characters, loading, error };
};