// pnpm social:shots: the pictures to share Glup on LinkedIn, drawn by the pages of apps/web/src/social
// (only in `astro dev`, never in the build). Builds them with GLUP_SOCIAL=1 into a temporary folder,
// serves it here and takes them with Edge (playwright-core), as web:shots does:
//   docs/images/social/01-portada.png … 08-cierre.png   the carousel, 1080 x 1350 at 2x
//   docs/images/social/glup-carrusel.pdf               the 8 slides in order (LinkedIn's carousel)
//   docs/images/social/glup-post.png                   1200 x 1200
//   docs/images/social/glup-enlace.png                 1200 x 627, for a shared link
// PNGs are compressed without loss; the PDF carries the slides as high-quality JPEG, so it stays light.
// Nothing is left running.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const root    = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const web     = join(root, 'apps', 'web');
const out     = join(root, 'docs', 'images', 'social');
const scratch = mkdtempSync(join(tmpdir(), 'glup-social-'));
const site    = join(scratch, 'site');
const PORT    = 4333;
const BASE    = `http://localhost:${PORT}/`;

// The same pages as apps/web/src/social/slides.ts (SOCIAL_PAGES), with their size and file.
const SLIDE  = { width: 1080, height: 1350, scale: 2 };
const SLIDES = ['portada', 'problema', 'como-funciona', 'imagenes-pdf', 'audio-video', 'tu-pc', 'privacidad', 'cierre'];
const SINGLE = [
  { page: 'post',   file: 'glup-post.png',   width: 1200, height: 1200, scale: 1 },
  { page: 'enlace', file: 'glup-enlace.png', width: 1200, height: 627,  scale: 1 },
];

const TYPES = {
  '.html'  : 'text/html; charset=utf-8',
  '.css'   : 'text/css',
  '.js'    : 'text/javascript',
  '.webp'  : 'image/webp',
  '.png'   : 'image/png',
  '.avif'  : 'image/avif',
  '.svg'   : 'image/svg+xml',
  '.woff2' : 'font/woff2',
};

const wait = (ms) => new Promise((done) => setTimeout(done, ms));

const build = () => {
  const astro = join(web, 'node_modules', 'astro', 'bin', 'astro.mjs');
  const run   = spawnSync(process.execPath, [astro, 'build', '--silent', '--outDir', site], { cwd: web, stdio: 'inherit', env: { ...process.env, GLUP_SOCIAL: '1' } });
  if (run.status !== 0) throw new Error('Las páginas de redes no se pudieron construir.');
};

const serve = () => new Promise((ready) => {
  const server = createServer((request, response) => {
    const path = decodeURIComponent(new URL(request.url, BASE).pathname);
    let file   = normalize(join(site, path));
    if (!file.startsWith(site)) return response.writeHead(403).end();
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) return response.writeHead(404).end();
    response.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    response.end(readFileSync(file));
  });
  server.listen(PORT, () => ready(server));
});

// One page at its exact size; still (reduced motion), once fonts and pictures are in.
const take = async (browser, { page: slug, width, height, scale }) => {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, reducedMotion: 'reduce' });
  const page    = await context.newPage();
  await page.goto(`${BASE}social/${slug}/`);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await wait(400);
  const png = await page.locator('[data-social-page]').screenshot({ type: 'png' });
  await context.close();
  return png;
};

// Lossless: the same pixels, compressed as hard as PNG allows.
const savePng = async (png, file) => {
  const path = join(out, file);
  writeFileSync(path, await sharp(png).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer());
  return path;
};

// The carousel as a PDF: one page per slide, each the slide as a high-quality JPEG.
const savePdf = async (browser, slides) => {
  const pages = await Promise.all(slides.map(async (png, index) => {
    const jpeg = join(scratch, `slide-${index + 1}.jpg`);
    writeFileSync(jpeg, await sharp(png).jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: '4:4:4' }).toBuffer());
    return `<img src="${pathToFileURL(jpeg).href}">`;
  }));
  const html = join(scratch, 'carrusel.html');
  writeFileSync(html, `<!doctype html><html><head><style>
    @page { size: ${SLIDE.width}px ${SLIDE.height}px; margin: 0; }
    html, body { margin: 0; padding: 0; }
    img { display: block; width: ${SLIDE.width}px; height: ${SLIDE.height}px; break-after: page; }
    img:last-child { break-after: auto; }
  </style></head><body>${pages.join('')}</body></html>`);

  const page = await (await browser.newContext()).newPage();
  await page.goto(pathToFileURL(html).href);
  await page.waitForLoadState('load');
  const path = join(out, 'glup-carrusel.pdf');
  await page.pdf({ path, width: `${SLIDE.width}px`, height: `${SLIDE.height}px`, printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  return path;
};

const main = async () => {
  mkdirSync(out, { recursive: true });
  build();
  const server  = await serve();
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const made    = [];

  try {
    const slides = [];
    for (const [index, slug] of SLIDES.entries()) {
      const png = await take(browser, { page: slug, ...SLIDE });
      slides.push(png);
      made.push(await savePng(png, `${String(index + 1).padStart(2, '0')}-${slug}.png`));
    }
    for (const single of SINGLE) made.push(await savePng(await take(browser, single), single.file));
    made.push(await savePdf(browser, slides));
  } finally {
    await browser.close();
    server.close();
    rmSync(scratch, { recursive: true, force: true });
  }

  for (const file of made) console.log(`${(statSync(file).size / 1024).toFixed(0).padStart(6)} KB  ${file.slice(root.length + 1)}`);
};

await main();
