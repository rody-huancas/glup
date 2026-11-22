// Why the island stays open when the cursor leaves: the person is in the middle of something.
// drag: a file over it · step: a list or grid step (order, pages, format, level) or a folder picker ·
// sign: the signing screen · dialog: a confirmation, the create-signature dialog or a file picker.
export type HoldReason = 'drag' | 'step' | 'sign' | 'dialog';
