// The [package] version of a Cargo.toml (Glup's single source of the version).
export const cargoVersion = (cargoToml: string): string | null =>
  /^\[package\][\s\S]*?\nversion\s*=\s*"([^"]+)"/m.exec(cargoToml)?.[1] ?? null;
