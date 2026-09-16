function getStickyNavOffset(): number {
  const nav = document.querySelector('nav');
  if (!nav) return 16;

  const style = window.getComputedStyle(nav);
  if (style.position !== 'sticky' && style.position !== 'fixed') return 16;

  const rect = nav.getBoundingClientRect();
  return Math.max(16, rect.bottom + 16);
}

/**
 * Smallest scroll that brings an element into view below the sticky nav, and none when it is already there
 *
 * - For a click that reveals something on the same page, where a full jump throws the reader away from what they clicked
 */
export function scrollElementIntoViewBelowNav(element: HTMLElement): void {
  const rect = element.getBoundingClientRect();
  const top = getStickyNavOffset();
  const bottom = window.innerHeight - 16;
  let delta = 0;
  if (rect.top < top) delta = rect.top - top;
  else if (rect.bottom > bottom) delta = Math.min(rect.bottom - bottom, rect.top - top);
  if (Math.abs(delta) < 1) return;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({
    top: Math.max(0, window.scrollY + delta),
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
  });
}

export function scrollToElementBelowNav(element: HTMLElement): void {
  const top = window.scrollY + element.getBoundingClientRect().top - getStickyNavOffset();
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({
    top: Math.max(0, top),
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
  });
}
