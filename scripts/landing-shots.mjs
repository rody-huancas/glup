// pnpm web:shots: the landing's pictures. Builds apps/web, serves dist on a local port (in this same
// process) and opens it in Edge with playwright-core, as docs:shots does. It leaves:
//   docs/images/landing/   escritorio.webp (first screen, moving), escritorio-completa.webp,
//                          escritorio-ideas.webp and celular-ideas.webp (the ideas form, filled in),
//                          celular.webp, celular-completa.webp, celular-menu.webp
//   apps/web/public/       og.png (the picture for sharing), favicon.png, apple-touch-icon.png
// The full pages are taken after walking down the whole page, so what animates on scroll is finished.
// Nothing is left running.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root    = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const web     = join(root, 'apps', 'web');
const dist    = join(web, 'dist');
const pub     = join(web, 'public');
const out     = join(root, 'docs', 'images', 'landing');
const scratch = mkdtempSync(join(tmpdir(), 'glup-landing-'));
const PORT    = 4329;
const BASE    = `http://localhost:${PORT}/`;

// WebP is at most 16383 px tall.
const MAX_HEIGHT = 16000;

const TYPES = {
  '.html'  : 'text/html; charset=utf-8',
  '.css'   : 'text/css',
  '.js'    : 'text/javascript',
  '.webp'  : 'image/webp',
  '.png'   : 'image/png',
  '.svg'   : 'image/svg+xml',
  '.woff2' : 'font/woff2',
  '.txt'   : 'text/plain',
};

const ffmpegPath = () => {
  const candidates = [process.env.GLUP_FFMPEG, process.env.APPDATA && join(process.env.APPDATA, 'dev.glup.desktop', 'tools', 'ffmpeg.exe')].filter(Boolean);
  const found      = candidates.find((path) => existsSync(path));
  if (found) return found;
  if (spawnSync('ffmpeg', ['-version']).status === 0) return 'ffmpeg';
  throw new Error('No encuentro FFmpeg: abre Glup y deja que lo descargue (Reducir peso de un video), o indica GLUP_FFMPEG.');
};

const FFMPEG = ffmpegPath();

const ffmpeg = (args) => {
  const run = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`FFmpeg: ${run.stderr}`);
};

const wait = (ms) => new Promise((done) => setTimeout(done, ms));

const build = () => {
  const astro = join(web, 'node_modules', 'astro', 'bin', 'astro.mjs');
  const run   = spawnSync(process.execPath, [astro, 'build', '--silent'], { cwd: web, stdio: 'inherit' });
  if (run.status !== 0) throw new Error('La página no se pudo construir.');
};

const serve = () => new Promise((ready) => {
  const server = createServer((request, response) => {
    const path = decodeURIComponent(new URL(request.url, BASE).pathname);
    let file   = normalize(join(dist, path));
    if (!file.startsWith(dist)) return response.writeHead(403).end();
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) return response.writeHead(404).end();
    response.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    response.end(readFileSync(file));
  });
  server.listen(PORT, () => ready(server));
});

const toWebp = (png, name) => {
  ffmpeg(['-i', png, '-c:v', 'libwebp', '-quality', '86', '-compression_level', '6', join(out, `${name}.webp`)]);
};

const settle = async (page, ms = 1200) => {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await wait(ms);
};

const open = async (browser, { width, height, scale, motion }) => {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, reducedMotion: motion ? 'no-preference' : 'reduce' });
  const page    = await context.newPage();
  await page.goto(BASE);
  await settle(page);
  return { context, page };
};

const firstScreen = async (browser, { name, width, height, scale, before }) => {
  const { context, page } = await open(browser, { width, height, scale, motion: true });
  if (before) await before(page);
  await wait(600);
  const png = join(scratch, `${name}.png`);
  await page.screenshot({ path: png });
  toWebp(png, name);
  await context.close();
};

// Walks down the whole page so every lazy picture loads and every animation that starts on scroll plays
// to its end; then back up. Returns the real height.
const walkDown = async (page, step) => {
  let top = 0;
  while (top < await page.evaluate(() => document.documentElement.scrollHeight)) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top);
    await wait(120);
    top += step;
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  return page.evaluate(() => document.documentElement.scrollHeight);
};

// The ideas form (Tally) comes in its own frame once its section comes near: wait until it shows its
// questions, at most 10 s, so the picture has it filled in.
const formsReady = async (page) => {
  try {
    await page.waitForFunction(() => [...document.querySelectorAll('iframe[data-tally-src]')].every((frame) => frame.src), null, { timeout: 10000 });
    const forms = page.frames().filter((frame) => frame.url().includes('tally.so'));
    await Promise.all(forms.map((frame) => frame.waitForFunction(() => document.body?.innerText.trim().length > 0, null, { timeout: 10000 })));
    // The form fades in once its text is there.
    await wait(3000);
  } catch {
    // Without internet the form stays empty; the rest of the page is taken anyway.
  }
};

// One section on its own, on screen (a frame from another site, as the ideas form, is only drawn while on
// screen: in the whole-page pictures it stays empty), without the fixed bars over it.
const sectionShot = async (browser, { name, selector, width, height, scale }) => {
  const { context, page } = await open(browser, { width, height, scale, motion: false });
  await page.addStyleTag({ content: '[data-nav], body > header, .skip-link { display: none !important; }' });
  await page.evaluate((target) => document.querySelector(target)?.scrollIntoView({ behavior: 'instant' }), selector);
  await formsReady(page);
  const png = join(scratch, `${name}.png`);
  await page.locator(selector).screenshot({ path: png });
  toWebp(png, name);
  await context.close();
};

// The whole page, as sharp as fits in a WebP, with the animations that played on the way down already
// finished; the fixed bars go to their ends of the page.
const wholePage = async (browser, { name, width, height, scale }) => {
  const probe      = await open(browser, { width, height, scale: 1, motion: false });
  const fullHeight = await walkDown(probe.page, height / 2);
  await probe.context.close();

  const fitted            = Math.min(scale, MAX_HEIGHT / (fullHeight + height));
  const { context, page } = await open(browser, { width, height, scale: fitted, motion: true });
  const png               = join(scratch, `${name}.png`);
  await walkDown(page, height / 2);
  await wait(1500);
  await page.addStyleTag({ content: '[data-nav] { position: static !important; } body { padding-bottom: 0 !important; }' });
  await settle(page, 600);
  await page.screenshot({ path: png, fullPage: true });
  toWebp(png, name);
  await context.close();
};

// The picture for sharing: the first screen at 1200 x 630, without the bars.
const shareCard = async (browser) => {
  const { context, page } = await open(browser, { width: 1200, height: 630, scale: 1, motion: false });
  await page.addStyleTag({ content: '[data-nav], body > header, body > a { display: none !important; } body { padding: 0 !important; }' });
  await wait(300);
  await page.screenshot({ path: join(pub, 'og.png') });
  await context.close();
};

const favicons = () => {
  const logo = join(root, 'docs', 'images', 'logo.png');
  ffmpeg(['-i', logo, '-vf', 'scale=64:64:force_original_aspect_ratio=decrease,pad=64:64:(ow-iw)/2:(oh-ih)/2:color=0x00000000', join(pub, 'favicon.png')]);
  ffmpeg(['-i', logo, '-vf', 'scale=150:150:force_original_aspect_ratio=decrease,pad=180:180:(ow-iw)/2:(oh-ih)/2:color=0xF4F1EA', join(pub, 'apple-touch-icon.png')]);
};

const main = async () => {
  mkdirSync(out, { recursive: true });
  mkdirSync(pub, { recursive: true });
  favicons();
  build();

  const server  = await serve();
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  try {
    const desktop = { width: 1440, height: 900, scale: 1.5 };
    const phone   = { width: 390, height: 844, scale: 2 };

    await firstScreen(browser, { name: 'escritorio', ...desktop });
    await wholePage(browser, { name: 'escritorio-completa', ...desktop });
    await firstScreen(browser, { name: 'celular', ...phone });
    await firstScreen(browser, {
      name   : 'celular-menu',
      ...phone,
      before : async (page) => {
        await page.evaluate(() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'instant' }));
        await wait(1200);
        await page.evaluate(() => document.querySelector('[data-nav-toggle]')?.click());
      },
    });
    await wholePage(browser, { name: 'celular-completa', ...phone });
    await sectionShot(browser, { name: 'escritorio-ideas', selector: '#ideas', ...desktop });
    await sectionShot(browser, { name: 'celular-ideas', selector: '#ideas', ...phone });
    await shareCard(browser);
    copyFileSync(join(pub, 'og.png'), join(dist, 'og.png'));
  } finally {
    await browser.close();
    server.close();
    rmSync(scratch, { recursive: true, force: true });
  }

  console.log('Capturas en docs/images/landing; og.png y favicons en apps/web/public.');
};

await main();
