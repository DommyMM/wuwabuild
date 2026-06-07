export function getStickyNavOffset(): number {
  const nav = document.querySelector('nav');
  if (!nav) return 16;

  const style = window.getComputedStyle(nav);
  if (style.position !== 'sticky' && style.position !== 'fixed') return 16;

  const rect = nav.getBoundingClientRect();
  return Math.max(16, rect.bottom + 16);
}

export function scrollToElementBelowNav(element: HTMLElement): void {
  const top = window.scrollY + element.getBoundingClientRect().top - getStickyNavOffset();
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({
    top: Math.max(0, top),
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
  });
}
