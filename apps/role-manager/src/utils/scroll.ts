/**
 * Scrolls the app-owned page viewport to its top without animation.
 */
export function scrollMainToTop(): void {
  document.querySelector('main')?.scrollTo({ top: 0, behavior: 'auto' });
}
