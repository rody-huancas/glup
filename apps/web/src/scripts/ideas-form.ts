// The ideas form (Tally): its script is only fetched when the section comes near the screen, so the page
// never waits for it. Tally then fills every iframe with data-tally-src; if the script cannot load, the
// iframe gets its address directly and still shows the form.
import { TALLY_SCRIPT_URL } from '@/content/ideas';

// How far before the section the script starts loading.
const AHEAD = '600px 0px';

const section = document.querySelector<HTMLElement>('[data-ideas]');
const frames  = [...document.querySelectorAll<HTMLIFrameElement>('[data-ideas] iframe[data-tally-src]')];

const fallback = (): void => {
  frames.forEach((frame) => {
    if (!frame.src && frame.dataset.tallySrc) frame.src = frame.dataset.tallySrc;
  });
};

const embed = (): void => {
  if (window.Tally) return window.Tally.loadEmbeds();
  fallback();
};

const load = (): void => {
  if (window.Tally) return embed();

  const script   = document.createElement('script');
  script.src     = TALLY_SCRIPT_URL;
  script.async   = true;
  script.onload  = embed;
  script.onerror = fallback;
  document.body.append(script);
};

if (section && frames.length > 0) {
  if ('IntersectionObserver' in window) {
    const watcher = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      watcher.disconnect();
      load();
    }, { rootMargin: AHEAD });
    watcher.observe(section);
  } else {
    load();
  }
}
