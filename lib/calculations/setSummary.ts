import { Echo, EchoPanelState, ElementType } from '@/lib/echo';

export interface BuildSetCount {
  element: ElementType;
  count: number;
}

/**
 * Count set pieces from the current echo panel state.
 * Mirrors the same duplicate-echo handling used by stats calculations.
 */
export function getBuildSetCounts(
  echoPanels: EchoPanelState[],
  getEcho: (id: string | null) => Echo | null
): BuildSetCount[] {
  const counts: Partial<Record<ElementType, number>> = {};
  const usedEchoes = new Set<string>();

  for (const panel of echoPanels) {
    if (!panel.id) continue;
    const echo = getEcho(panel.id);
    if (!echo || usedEchoes.has(echo.id)) continue;

    const element =
      echo.elements.length === 1
        ? echo.elements[0]
        : panel.selectedElement ?? echo.elements[0] ?? null;

    if (!element) continue;

    counts[element] = (counts[element] ?? 0) + 1;
    usedEchoes.add(echo.id);
  }

  return Object.entries(counts)
    .map(([element, count]) => ({
      element: element as ElementType,
      count: count ?? 0,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.element.localeCompare(b.element);
    });
}
