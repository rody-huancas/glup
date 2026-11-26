// pnpm docs:shots: the pictures of the README, taken from the real interface in demo mode (Vite, with
// Tauri replaced by sample data: apps/desktop/src/demo). Edge (it comes with Windows) is driven by
// playwright-core, so no browser is downloaded (the clip comes from Edge's own screencast: Playwright's
// video would download another FFmpeg); FFmpeg is the one Glup downloads for videos. Everything
// goes to docs/images as WebP (stills) and GIF + MP4 (the short clip). Nothing is left running.
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root    = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const desktop = join(root, 'apps', 'desktop');
const images  = join(root, 'docs', 'images');
const media   = join(desktop, 'demo-media');
const scratch = mkdtempSync(join(tmpdir(), 'glup-docs-'));
const PORT    = 1430;
const BASE    = `http://localhost:${PORT}/demo.html`;

// The panel, sharp (2x); the desktop scenes a little less, they are wide.
const PANEL_SCALE   = 2;
const DESKTOP_SCALE = 1.25;
const DESKTOP       = { width: 1600, height: 900 };

const ffmpegPath = () => {
  const candidates = [process.env.GLUP_FFMPEG, process.env.APPDATA && join(process.env.APPDATA, 'dev.glup.desktop', 'tools', 'ffmpeg.exe')].filter(Boolean);
  const found      = candidates.find((path) => existsSync(path));
  if (found) return found;
  const which = spawnSync('ffmpeg', ['-version']);
  if (which.status === 0) return 'ffmpeg';
  throw new Error('No encuentro FFmpeg: abre Glup y deja que lo descargue (Reducir peso de un video), o indica GLUP_FFMPEG.');
};

const FFMPEG = ffmpegPath();

const ffmpeg = (args) => {
  const run = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`FFmpeg: ${run.stderr}`);
};

const wait = (ms) => new Promise((done) => setTimeout(done, ms));

// The clip Subtítulos plays: a soft gradient, made here (no picture with anybody's rights).
const makeClip = () => {
  mkdirSync(media, { recursive: true });
  ffmpeg(['-f', 'lavfi', '-i', 'gradients=s=1280x720:c0=0x2b2f4a:c1=0x7ee0bc:c2=0xf6c36b:n=3:speed=0.015:d=24', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', '24', '-c:v', 'h264_mf', '-b:v', '900k', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', join(media, 'clase.mp4')]);
};

const startVite = async () => {
  const vite = spawn(process.execPath, [join(desktop, 'node_modules', 'vite', 'bin', 'vite.js'), '--config', 'vite.demo.config.ts', '--logLevel', 'error'], { cwd: desktop, stdio: 'inherit' });
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const answer = await fetch(BASE);
      if (answer.ok) return vite;
    } catch {
      // Not up yet.
    }
    await wait(500);
  }
  vite.kill();
  throw new Error('El servidor del modo demo no arrancó.');
};

const toWebp = (png, name) => {
  const out = join(images, `${name}.webp`);
  ffmpeg(['-i', png, '-c:v', 'libwebp', '-pix_fmt', 'yuva420p', '-quality', '88', '-compression_level', '6', out]);
  return out;
};

const settle = async (page, ms = 1800) => {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await wait(ms);
};

// One screen of the panel, cut exactly to its visible area.
const panelShot = async (browser, { name, query, before }) => {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: PANEL_SCALE, reducedMotion: 'no-preference' });
  const page    = await context.newPage();
  await page.goto(`${BASE}?${query}`);
  await settle(page);
  if (before) await before(page);
  const area = await page.evaluate(() => window.glupDemo.area());
  const png  = join(scratch, `${name}.png`);
  // Transparent around the island's rounded edge (never white corners).
  await page.screenshot({ path: png, clip: area, omitBackground: true });
  await context.close();
  return toWebp(png, name);
};

// The island on the desktop of the pictures; at rest it is small, so only the top of the desktop shows.
const desktopShot = async (browser, { name, query, ms, top }) => {
  const context = await browser.newContext({ viewport: DESKTOP, deviceScaleFactor: DESKTOP_SCALE });
  const page    = await context.newPage();
  await page.goto(`${BASE}?scene=desktop&${query}`);
  await settle(page, ms);
  const png  = join(scratch, `${name}.png`);
  const clip = top ? { x: (DESKTOP.width - top.width) / 2, y: 0, ...top } : undefined;
  await page.screenshot({ path: png, clip });
  await context.close();
  return toWebp(png, name);
};

const PHOTO = 'C:\\Users\\Ana\\Downloads\\Vacaciones Cusco 014.heic';

// The short clip: the island at rest, it opens, a photo is dropped, Glup eats it and the result shows.
// Edge sends a frame each time the page changes; each one lasts until the next.
const clip = async (browser) => {
  const context = await browser.newContext({ viewport: DESKTOP, deviceScaleFactor: 1 });
  const page    = await context.newPage();
  await page.goto(`${BASE}?scene=desktop&island=collapsed`);
  await settle(page, 600);

  const cdp    = await context.newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const file = join(scratch, `frame-${String(frames.length).padStart(4, '0')}.jpg`);
    writeFileSync(file, Buffer.from(data, 'base64'));
    frames.push({ file, at: metadata.timestamp });
    void cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => undefined);
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, everyNthFrame: 1 });

  await wait(900);
  await page.evaluate(() => {
    window.glupDemo.hover(true);
    window.glupDemo.open();
  });
  await wait(1300);
  await page.evaluate((path) => window.glupDemo.drag([path]), PHOTO);
  await wait(700);
  await page.evaluate((path) => window.glupDemo.drop([path]), PHOTO);
  await wait(1700);
  await page.getByRole('button', { name: 'A JPG', exact: true }).click();
  await wait(700);
  await page.getByRole('button', { name: /^Normal/ }).click();
  await wait(2000);
  await cdp.send('Page.stopScreencast');
  const end   = Date.now() / 1000;
  const frame = await page.evaluate(() => window.glupDemo.frame());
  await context.close();

  // Each frame lasts until the next one; the last, until the end.
  const lines = frames.flatMap((item, index) => {
    const next = frames[index + 1]?.at ?? end;
    return [`file '${item.file.replaceAll('\\', '/')}'`, `duration ${Math.max(0.01, next - item.at).toFixed(3)}`];
  });
  lines.push(`file '${frames.at(-1).file.replaceAll('\\', '/')}'`);
  const list = join(scratch, 'frames.txt');
  writeFileSync(list, `${lines.join('\n')}\n`);
  return { list, frame };
};

const encodeClip = ({ list, frame }) => {
  // Only around the island (its window and a little desktop), at a width GitHub shows whole; 8 s at most.
  const x      = Math.max(0, frame.x - 40);
  const width  = Math.min(DESKTOP.width - x, frame.width + 80);
  const height = Math.min(DESKTOP.height, frame.height + 40);
  const crop   = `crop=${width}:${height}:${x}:0`;
  const input  = ['-f', 'concat', '-safe', '0', '-i', list, '-t', '8'];
  const gif    = join(images, 'glup.gif');
  const mp4    = join(images, 'glup.mp4');
  ffmpeg([...input, '-filter_complex', `[0:v]${crop},fps=12,scale=760:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle`, gif]);
  ffmpeg([...input, '-vf', `${crop},fps=30,scale=1080:-2:flags=lanczos`, '-c:v', 'h264_mf', '-b:v', '1500k', '-pix_fmt', 'yuv420p', '-an', mp4]);
  return [gif, mp4];
};

const PANELS = [
  { name: 'inicio', query: 'screen=home' },
  { name: 'habilidades', query: 'screen=tools' },
  { name: 'familia-pdf', query: 'screen=family&id=pdf' },
  { name: 'tarea-en-curso', query: 'screen=task' },
  { name: 'resultado', query: 'screen=result' },
  { name: 'historial', query: 'screen=history' },
  { name: 'portapapeles', query: 'screen=clipboard' },
  { name: 'que-ocupa-espacio', query: 'screen=space' },
  { name: 'archivos-repetidos', query: 'screen=duplicates', before: (page) => wait(800) },
  {
    name   : 'subtitulos',
    query  : 'screen=subtitles',
    before : async (page) => {
      await page.getByRole('button', { name: 'Escuchar el video' }).click();
      await wait(1800);
    },
  },
  {
    name   : 'escanear-documento',
    query  : 'screen=scan',
    // Until every photo is open and its sheet found.
    before : async (page) => {
      await page.getByText('Abriendo las fotos').waitFor({ state: 'detached', timeout: 15_000 });
      await page.getByText('Buscando la hoja').waitFor({ state: 'detached', timeout: 15_000 });
      await wait(800);
    },
  },
  { name: 'ajustes-posicion', query: 'screen=position' },
];

const DESKTOPS = [
  { name: 'isla-recogida', query: 'island=collapsed', ms: 1200, top: { width: 860, height: 260 } },
  { name: 'isla-aviso', query: 'island=notice', ms: 1500, top: { width: 860, height: 260 } },
  { name: 'isla-abierta', query: 'island=open&screen=home', ms: 2200 },
];

// The family Glups, as they are in the app.
const copyArt = () => {
  const families = join(images, 'familias');
  mkdirSync(families, { recursive: true });
  const assets = join(desktop, 'src', 'modules', 'families', 'assets');
  readdirSync(assets).filter((file) => file.endsWith('-128.webp')).forEach((file) => copyFileSync(join(assets, file), join(families, file.replace('-128', ''))));
};

// The logo: Glup drawn by the app itself from its layers (never the app icon, which is the body alone),
// at rest (no motion), cut to what is drawn with the same margin on every side, at 2x of its 112 px.
const LOGO_WIDTH  = 112;
const LOGO_MARGIN = 0.06;

const logo = async (browser) => {
  const context = await browser.newContext({ viewport: { width: 400, height: 400 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page    = await context.newPage();
  await page.goto(`${BASE}?scene=mascot`);
  await settle(page, 800);
  const shot    = await page.locator('#mascot').screenshot({ omitBackground: true });
  const trimmed = await page.evaluate(async ({ data, width, margin }) => {
    const image = new Image();
    image.src   = `data:image/png;base64,${data}`;
    await image.decode();
    const source  = document.createElement('canvas');
    source.width  = image.width;
    source.height = image.height;
    const reading = source.getContext('2d', { willReadFrequently: true });
    reading.drawImage(image, 0, 0);
    const { data: pixels } = reading.getImageData(0, 0, image.width, image.height);
    let [left, top, right, bottom] = [image.width, image.height, -1, -1];
    for (let y = 0; y < image.height; y += 1) {
      for (let x = 0; x < image.width; x += 1) {
        if (pixels[(y * image.width + x) * 4 + 3] > 8) {
          left   = Math.min(left, x);
          right  = Math.max(right, x);
          top    = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
      }
    }
    // What is drawn, scaled to 2x of the logo's width, with the same margin around it.
    const drawn   = { width: right - left + 1, height: bottom - top + 1 };
    const scale   = (width * 2 * (1 - 2 * margin)) / drawn.width;
    const pad     = Math.round(width * 2 * margin);
    const out     = document.createElement('canvas');
    out.width     = width * 2;
    out.height    = Math.round(drawn.height * scale) + pad * 2;
    const writing = out.getContext('2d');
    writing.imageSmoothingQuality = 'high';
    writing.drawImage(source, left, top, drawn.width, drawn.height, pad, pad, out.width - pad * 2, out.height - pad * 2);
    return out.toDataURL('image/png').split(',')[1];
  }, { data: shot.toString('base64'), width: LOGO_WIDTH, margin: LOGO_MARGIN });
  await context.close();
  const file = join(images, 'logo.png');
  writeFileSync(file, Buffer.from(trimmed, 'base64'));
  return file;
};

// `pnpm docs:shots inicio glup logo` makes only those (glup: the GIF and the MP4); with no names, all of them.
const only   = process.argv.slice(2);
const wanted = (name) => only.length === 0 || only.includes(name);

const main = async () => {
  mkdirSync(images, { recursive: true });
  makeClip();
  const vite    = await startVite();
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const made    = [];
  try {
    for (const shot of PANELS.filter((item) => wanted(item.name))) made.push(await panelShot(browser, shot));
    for (const shot of DESKTOPS.filter((item) => wanted(item.name))) made.push(await desktopShot(browser, shot));
    if (wanted('glup')) made.push(...encodeClip(await clip(browser)));
    if (wanted('logo')) made.push(await logo(browser));
    if (only.length === 0) copyArt();
  } finally {
    await browser.close();
    vite.kill();
    rmSync(scratch, { recursive: true, force: true });
    rmSync(media, { recursive: true, force: true });
  }
  for (const file of made) console.log(`${(statSync(file).size / 1024).toFixed(0).padStart(6)} KB  ${file.slice(root.length + 1)}`);
};

await main();
