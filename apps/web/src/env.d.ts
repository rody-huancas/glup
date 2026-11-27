// Glup's version, written at build time by astro.config.ts.
declare const __GLUP_VERSION__: string;

// Tally's embed script (scripts/ideas-form.ts) leaves this on window once loaded.
interface Window {
  Tally?: { loadEmbeds: () => void };
}
