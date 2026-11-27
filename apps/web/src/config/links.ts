const REPOSITORY = 'https://github.com/rody-huancas/glup';

export const LINKS = {
  // The latest installer itself, with a fixed name (release.yml uploads Glup-Windows.exe with every
  // version); every version, with its notes, is in releases.
  download   : `${REPOSITORY}/releases/latest/download/Glup-Windows.exe`,
  releases   : `${REPOSITORY}/releases`,
  repository : REPOSITORY,
  license    : `${REPOSITORY}/blob/master/LICENSE`,
  notices    : `${REPOSITORY}/blob/master/THIRD_PARTY_NOTICES.md`,
  author     : 'https://github.com/rody-huancas',
} as const;
