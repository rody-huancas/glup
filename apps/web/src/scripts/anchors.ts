// In-page links (the bottom bar, the logo, «Saltar al contenido») scroll to their section, smoothly as
// the page's CSS says (instant with reduced motion), and never leave a # in the address: scrolling does
// not change it either. The start (the logo, «01 Inicio») goes to the very top with a clean address. A
// visit that arrives with a # (a shared link) lands on its section and the # is then removed.
import { SECTIONS } from '@/config/sections';
import { anchorTarget } from '@/lib/anchors';

const FIRST = SECTIONS[0].id;

const cleanAddress = (): void => {
  if (location.hash) history.replaceState(history.state, '', `${location.pathname}${location.search}`);
};

// The target also takes the focus (without scrolling again), so the keyboard and screen readers go on
// from there, as with a normal link. Never on load: only when a link is used.
const focusOn = (element: HTMLElement): void => {
  if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '-1');
  element.focus({ preventScroll: true });
};

const go = (target: string | 'top'): void => {
  if (target === 'top') {
    window.scrollTo({ top: 0 });
    const title = document.getElementById(`${FIRST}-title`);
    if (title) focusOn(title);
    return cleanAddress();
  }

  const element = document.getElementById(target);
  if (!element) return;
  element.scrollIntoView({ block: 'start' });
  focusOn(element);
  cleanAddress();
};

document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const link   = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
  const target = link ? anchorTarget(link.getAttribute('href') ?? '', FIRST) : null;
  if (!target) return;

  event.preventDefault();
  go(target);
});

// Arrived with a #: the browser has already scrolled there by `load`; then the address is cleaned.
if (location.hash) {
  const land = (): void => {
    const target = anchorTarget(location.hash, FIRST);
    if (target && target !== 'top') document.getElementById(target)?.scrollIntoView({ block: 'start', behavior: 'instant' });
    cleanAddress();
  };

  if (document.readyState === 'complete') land();
  else window.addEventListener('load', land, { once: true });
}
