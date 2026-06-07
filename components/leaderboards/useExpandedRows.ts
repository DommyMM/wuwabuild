'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useExpandedRows() {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const expandedIdsRef = useRef(expandedIds);

  useEffect(() => {
    expandedIdsRef.current = expandedIds;
  }, [expandedIds]);

  const toggleExpandedId = useCallback((rawId: string, onExpand?: (id: string) => void) => {
    const id = rawId.trim();
    if (!id) return;

    const willExpand = !expandedIdsRef.current.has(id);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (willExpand) {
        next.add(id);
      } else {
        next.delete(id);
      }
      expandedIdsRef.current = next;
      return next;
    });
    if (willExpand) onExpand?.(id);
  }, []);

  return {
    expandedIds,
    setExpandedIds,
    toggleExpandedId,
    hasExpandedRows: expandedIds.size > 0,
  };
}
