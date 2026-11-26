// The badges of the README as Glup's own SVG files (docs/images/badges), so they never depend on
// another service: a dark grey label on the left and the value in a colour of Glup on the right. The
// version comes from Cargo.toml; `pnpm version:set` and `pnpm docs:shots` write them again.
// Usage: node scripts/badges.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const HEIGHT  = 20;
const PADDING = 6;
const RADIUS  = 4;
// The value is bold: a little wider than the table says.
const BOLD    = 1.1;
const LABEL   = '#3a3846';
const INK     = '#141318';
const FONT    = "Verdana, 'DejaVu Sans', Geneva, sans-serif";

// Widths of Verdana at 11 px (the font of the badges), enough to size each half; textLength then makes
// the text fill exactly that width whatever font the browser has.
const WIDTHS = [
  [' ', 3.9], ['il.,:;|!\'', 3.1], ['fjrtI()[]', 4.6], ['0123456789', 7], ['abcdeghknopqsuvxyz', 6.6],
  ['ABCDEFGHJKLNOPQRSTUVXYZ', 7.6], ['mwMW', 10.2], ['áéíóú', 6.6], ['ÁÉÍÓÚ', 7.6], ['ñ', 7], ['Ñ', 8.4],
];

export const textWidth = (text) =>
  [...text].reduce((total, char) => total + (WIDTHS.find(([chars]) => chars.includes(char))?.[1] ?? 7), 0);

const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// One badge: «licencia | MIT». The value's letters are dark: every colour of Glup is light.
export const badge = ({ label, value, color }) => {
  const left   = Math.round(textWidth(label) + PADDING * 2);
  const right  = Math.round(textWidth(value) * BOLD + PADDING * 2);
  const width  = left + right;
  const title  = `${label}: ${value}`;
  const text   = (content, x, length, fill) =>
    `<text x="${x}" y="14" fill="${fill}" textLength="${length}" lengthAdjust="spacingAndGlyphs">${escape(content)}</text>`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${HEIGHT}" role="img" aria-label="${escape(title)}">`,
    `<title>${escape(title)}</title>`,
    `<clipPath id="r"><rect width="${width}" height="${HEIGHT}" rx="${RADIUS}"/></clipPath>`,
    '<g clip-path="url(#r)">',
    `<rect width="${left}" height="${HEIGHT}" fill="${LABEL}"/>`,
    `<rect x="${left}" width="${right}" height="${HEIGHT}" fill="${color}"/>`,
    '</g>',
    `<g font-family="${FONT}" font-size="11">`,
    text(label, PADDING, left - PADDING * 2, '#ffffff'),
    `<g font-weight="bold">${text(value, left + PADDING, right - PADDING * 2, INK)}</g>`,
    '</g>',
    '</svg>',
    '',
  ].join('\n');
};

export const cargoVersion = () => {
  const toml  = readFileSync(join(root, 'apps', 'desktop', 'src-tauri', 'Cargo.toml'), 'utf8');
  const found = toml.match(/^\[package\][\s\S]*?\nversion\s*=\s*"([^"]+)"/m);
  if (!found) throw new Error('No encontré la versión en Cargo.toml');
  return found[1];
};

// The three badges of the README: the license, Windows and the version (from Cargo.toml).
export const writeBadges = () => {
  const folder = join(root, 'docs', 'images', 'badges');
  mkdirSync(folder, { recursive: true });
  const badges = {
    'licencia.svg' : { label: 'licencia', value: 'MIT', color: '#7ee0bc' },
    'windows.svg'  : { label: 'Windows', value: '10 | 11', color: '#9d90fa' },
    'version.svg'  : { label: 'versión', value: cargoVersion(), color: '#f6c36b' },
  };
  return Object.entries(badges).map(([name, content]) => {
    const file = join(folder, name);
    writeFileSync(file, badge(content));
    return file;
  });
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeBadges().forEach((file) => console.log(file.slice(root.length + 1)));
}
