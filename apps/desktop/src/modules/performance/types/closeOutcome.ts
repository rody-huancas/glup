// What close_app answers: closed, still open after asking (it may be asking to save), or with no window to ask.
export type CloseOutcome = 'closed' | 'stillOpen' | 'noWindow';
