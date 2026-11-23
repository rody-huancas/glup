import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cargoVersion } from '@/modules/updates/utils/version';

// Read from disk: these files live outside src, where the @/ alias does not reach.
const PACKAGE_JSON = new URL('../../../../package.json', import.meta.url);
const CARGO_TOML   = new URL('../../../../src-tauri/Cargo.toml', import.meta.url);
const TAURI_CONF   = new URL('../../../../src-tauri/tauri.conf.json', import.meta.url);

describe('version', () => {
  it('reads the [package] version, not a dependency one', () => {
    expect(cargoVersion('[package]\nname    = "glup"\nversion = "1.2.3"\n\n[dependencies]\nserde = { version = "1" }\n')).toBe('1.2.3');
    expect(cargoVersion('[dependencies]\nserde = "1"\n')).toBeNull();
  });

  // pnpm version:set keeps them together; this fails in CI if someone edits only one.
  it('package.json follows Cargo.toml', () => {
    const packageJson = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')) as { version: string };
    expect(packageJson.version).toBe(cargoVersion(readFileSync(CARGO_TOML, 'utf8')));
  });

  it('tauri.conf.json has no version of its own (Tauri reads Cargo.toml)', () => {
    expect(JSON.parse(readFileSync(TAURI_CONF, 'utf8'))).not.toHaveProperty('version');
  });
});
