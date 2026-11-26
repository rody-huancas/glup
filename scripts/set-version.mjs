// Sets Glup's version. Cargo.toml is the source (tauri.conf.json has no version, so Tauri reads it);
// package.json, Cargo.lock and the version badge of the README follow. Usage: pnpm version:set 0.2.0
import { readFileSync, writeFileSync } from 'node:fs';
import { writeBadges } from './badges.mjs';

const CARGO_TOML   = 'apps/desktop/src-tauri/Cargo.toml';
const CARGO_LOCK   = 'apps/desktop/src-tauri/Cargo.lock';
const PACKAGE_JSON = 'apps/desktop/package.json';
const SEMVER       = /^\d+\.\d+\.\d+$/;

const version = process.argv[2] ?? '';

if (!SEMVER.test(version)) {
  console.error('Usa: pnpm version:set 0.2.0 (tres números, sin la «v»)');
  process.exit(1);
}

// Where the version is in each file (with Windows line ends too: git may check them out as \r\n). Only
// the [package] version of Cargo.toml, keeping the aligned columns.
const CHANGES = [
  { file: CARGO_TOML, pattern: /^(\[package\][\s\S]*?\r?\nversion\s*=\s*)"[^"]*"/m },
  { file: CARGO_LOCK, pattern: /(\r?\nname = "glup"\r?\nversion = )"[^"]*"/ },
  { file: PACKAGE_JSON, pattern: /("version"\s*:\s*)"[^"]*"/ },
];

// All three found before any is written: never half a version.
const texts = CHANGES.map(({ file, pattern }) => {
  const text = readFileSync(file, 'utf8');
  if (!pattern.test(text)) throw new Error(`No encontré la versión en ${file}`);
  return text;
});
CHANGES.forEach(({ file, pattern }, index) => writeFileSync(file, texts[index].replace(pattern, `$1"${version}"`)));

// The version badge of the README follows.
writeBadges();

console.log(`Versión ${version} en Cargo.toml, Cargo.lock, package.json y la insignia del README.`);
