import { useEffect } from 'react';

export const useStatHighlight = () => {
  useEffect(() => {
    const handleHover = (event: MouseEvent) => {
      const element = (event.target as HTMLElement).closest(
        '.weapon-stat.weapon-attack, .weapon-stat.weapon-main-stat, .stat-row, .substat-container, .weapon-passive, .main-stat-display, .set-row, .simplified-node.active'
      );
      if (!element) return;

      const structuralClasses = [
        'stat-row', 'substat-container', 'weapon-stat', 'weapon-attack', 'weapon-main-stat', 'weapon-passive', 'main-stat-display',
        'left-align', 'right-align', 'center-align', 'set-row','simplified-node', 'hover-highlight', 'active', 'circle'
      ];

      const statClass = Array.from(element.classList)
        .find(cls => !structuralClasses.includes(cls));

      if (statClass) {
        const selector = [
          `.stat-row.${statClass}`, `.substat-container.${statClass}`, `.weapon-stat.weapon-attack.${statClass}`, `.weapon-stat.weapon-main-stat.${statClass}`,
          `.weapon-passive.${statClass}`, `.main-stat-display.${statClass}`, `.set-row.${statClass}`, `.simplified-node.active.${statClass}`
        ].join(', ');
        
        const relatedElements = document.querySelectorAll(selector);
        relatedElements.forEach(related => {
          if (event.type === 'mouseover') {
            related.classList.add('hover-highlight');
          } else {
            related.classList.remove('hover-highlight');
          }
        });
      }
    };

    document.addEventListener('mouseover', handleHover, true);
    document.addEventListener('mouseout', handleHover, true);

    return () => {
      document.removeEventListener('mouseover', handleHover, true);
      document.removeEventListener('mouseout', handleHover, true);
    };
  }, []);
};