import { activeElementForPanel, Echo, EchoPanelState, ElementType } from '@/lib/echo';

interface BuildSetCount {
  element: ElementType;
  count: number;
}

/** An echo counts once per selected set and never twice within one set, matching the stats calculations */
export function getBuildSetCounts(
  echoPanels: EchoPanelState[],
  getEcho: (id: string | null) => Echo | null
): BuildSetCount[] {
  const counts: Partial<Record<ElementType, number>> = {};
  const usedEchoSetPieces = new Set<string>();

  for (const panel of echoPanels) {
    if (!panel.id) continue;
    const echo = getEcho(panel.id);
    if (!echo) continue;

    const element = activeElementForPanel(panel, echo);

    if (!element) continue;

    const echoSetKey = `${element}:${echo.id}`;
    if (usedEchoSetPieces.has(echoSetKey)) continue;

    counts[element] = (counts[element] ?? 0) + 1;
    usedEchoSetPieces.add(echoSetKey);
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
