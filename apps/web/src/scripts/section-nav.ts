// The bottom bar: paints the section being read with its color, and on phones opens and closes the
// list of sections. Reads the DOM only through data-* attributes.
import { activeSection } from '@/lib/active-section';
import type { SectionId } from '@/types/section.types';

const READING_LINE = 0.4;

const nav     = document.querySelector<HTMLElement>('[data-nav]');
const toggle  = document.querySelector<HTMLButtonElement>('[data-nav-toggle]');
const list    = document.querySelector<HTMLElement>('[data-nav-list]');
const current = document.querySelector<HTMLElement>('[data-nav-current]');
const links   = [...document.querySelectorAll<HTMLAnchorElement>('[data-nav-link]')];
const ids     = links.map((link) => link.dataset.navLink as SectionId);

let shown: SectionId | null = null;

const show = (id: SectionId): void => {
  if (id === shown) return;
  shown = id;

  links.forEach((link) => {
    const isCurrent = link.dataset.navLink === id;
    if (isCurrent) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');

    if (isCurrent && current && toggle) {
      current.textContent = link.textContent?.replace(/^\s*\d+\s*/, '').trim() ?? '';
      toggle.className    = toggle.className.replace(/nav-link--\w+/, `nav-link--${link.dataset.accent}`);
    }
  });
};

const update = (): void => {
  const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
  if (atEnd) return show(ids[ids.length - 1]);

  const tops = ids.flatMap((id) => {
    const section = document.getElementById(id);
    return section ? [{ id, top: section.getBoundingClientRect().top }] : [];
  });
  const id = activeSection(tops, window.innerHeight * READING_LINE);
  if (id) show(id);
};

let pending = false;

const schedule = (): void => {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    update();
  });
};

const setOpen = (open: boolean): void => {
  if (!toggle || !list) return;
  toggle.setAttribute('aria-expanded', String(open));
  list.dataset.open = String(open);
};

toggle?.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
links.forEach((link) => link.addEventListener('click', () => setOpen(false)));

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || toggle?.getAttribute('aria-expanded') !== 'true') return;
  setOpen(false);
  toggle.focus();
});

document.addEventListener('click', (event) => {
  if (nav && !nav.contains(event.target as Node)) setOpen(false);
});

window.addEventListener('scroll', schedule, { passive: true });
window.addEventListener('resize', schedule);
update();
