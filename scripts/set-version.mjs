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

const replaceOnce = (file, pattern, replacement) => {
  const text = readFileSync(file, 'utf8');
  if (!pattern.test(text)) throw new Error(`No encontré la versión en ${file}`);
  writeFileSync(file, text.replace(pattern, replacement));
};

// Only the [package] version, keeping the aligned columns.
replaceOnce(CARGO_TOML, /^(\[package\][\s\S]*?\nversion\s*=\s*)"[^"]*"/m, `$1"${version}"`);
replaceOnce(CARGO_LOCK, /(\nname = "glup"\nversion = )"[^"]*"/, `$1"${version}"`);
replaceOnce(PACKAGE_JSON, /("version"\s*:\s*)"[^"]*"/, `$1"${version}"`);

// The version badge of the README follows.
writeBadges();

console.log(`Versión ${version} en Cargo.toml, Cargo.lock, package.json y la insignia del README.`);
