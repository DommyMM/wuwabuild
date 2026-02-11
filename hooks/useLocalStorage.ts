'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for using localStorage with SSR safety and automatic JSON serialization.
 * Handles hydration mismatches by only reading from localStorage after mount.
 *
 * @param key - The localStorage key
 * @param initialValue - Default value if key doesn't exist
 * @returns [storedValue, setValue, removeValue] tuple
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Track if we've mounted (for SSR safety)
  const isMounted = useRef(false);

  // Initialize with the initial value (SSR safe)
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Read from localStorage after mount
  useEffect(() => {
    isMounted.current = true;

    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
  }, [key]);

  // Memoized setter that updates both state and localStorage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        // Allow value to be a function (like useState)
        const valueToStore = value instanceof Function ? value(storedValue) : value;

        setStoredValue(valueToStore);

        // Only write to localStorage on client
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));

          // Dispatch storage event for cross-tab sync
          window.dispatchEvent(new StorageEvent('storage', {
            key,
            newValue: JSON.stringify(valueToStore)
          }));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // Listen for changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          setStoredValue(JSON.parse(event.newValue));
        } catch (error) {
          console.warn(`Error parsing storage event for key "${key}":`, error);
        }
      } else if (event.key === key && event.newValue === null) {
        setStoredValue(initialValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

/**
 * Simple version of useLocalStorage that doesn't handle functions as values.
 * Useful for simple string/number storage.
 */
export function useLocalStorageSimple<T extends string | number | boolean>(
  key: string,
  initialValue: T
): [T, (value: T) => void] {
  const [value, setValue] = useLocalStorage<T>(key, initialValue);
  return [value, setValue as (value: T) => void];
}

export default useLocalStorage;
