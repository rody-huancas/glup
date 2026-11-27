// The download page of Glup: static, with Tailwind. Glup's version comes from the desktop app's
// package.json (pnpm version:set keeps it in step with Cargo.toml); SITE_URL, once there is a domain.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

const desktopPackage = JSON.parse(readFileSync(fileURLToPath(new URL('../desktop/package.json', import.meta.url)), 'utf8'));

export default defineConfig({
  site     : process.env.SITE_URL || undefined,
  output   : 'static',
  devToolbar: { enabled: false },
  build    : { inlineStylesheets: 'always' },
  vite     : {
    plugins : [tailwindcss()],
    define  : { __GLUP_VERSION__: JSON.stringify(desktopPackage.version) },
  },
});
