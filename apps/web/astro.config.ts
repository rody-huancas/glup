// The download page of Glup: static, with Tailwind. Glup's version comes from Cargo.toml (the source of
// the version, pnpm version:set); SITE_URL, once there is a domain.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

const cargo   = readFileSync(fileURLToPath(new URL('../desktop/src-tauri/Cargo.toml', import.meta.url)), 'utf8');
const version = /^\[package\][\s\S]*?\r?\nversion\s*=\s*"([^"]+)"/m.exec(cargo)?.[1];

if (!version) throw new Error('No encontré la versión en apps/desktop/src-tauri/Cargo.toml');

export default defineConfig({
  site       : process.env.SITE_URL || undefined,
  output     : 'static',
  devToolbar : { enabled: false },
  build      : { inlineStylesheets: 'always' },
  // WebP is always lossless here: Glup's renders keep their soft shading clean at half the weight of a PNG.
  // Pictures where a little loss does not show (the screenshots) go out as AVIF.
  image      : { service: { entrypoint: 'astro/assets/services/sharp', config: { webp: { lossless: true } } } },
  vite       : {
    plugins : [tailwindcss()],
    define  : { __GLUP_VERSION__: JSON.stringify(version) },
  },
});
