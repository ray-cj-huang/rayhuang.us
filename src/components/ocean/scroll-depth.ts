/** How far down the page the reader has scrolled: 0 at the top, 1 at the bottom. */
export function getScrollDepth(): number {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  if (scrollable <= 0) return 0;
  return Math.min(1, Math.max(0, window.scrollY / scrollable));
}
