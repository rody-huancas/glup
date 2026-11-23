// partial: only modifiers so far · invalid: it would get in the way of typing · shortcut: ready to save.
export type ShortcutPress = { kind: 'partial' } | { kind: 'invalid' } | { kind: 'shortcut'; shortcut: string };
