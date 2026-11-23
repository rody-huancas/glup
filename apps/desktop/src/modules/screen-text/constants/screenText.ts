// The overlays Rust opens, one per monitor: capture-0, capture-1…
export const CAPTURE_WINDOW_PREFIX = 'capture-';

// A drag shorter than this (CSS pixels) is a click, not a zone.
export const MIN_ZONE_SIDE = 3;

export const STILL_TYPE = 'image/png';

export const MODIFIER_CODES = ['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'ShiftLeft', 'ShiftRight', 'MetaLeft', 'MetaRight'];

// Letters, digits, F1 to F12 and Space: keys every keyboard has in the same place.
export const SHORTCUT_KEY = /^(Key[A-Z]|Digit[0-9]|F([1-9]|1[0-2])|Space)$/;
