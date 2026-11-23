// idle: nothing running (the card shows if there is an update). The rest come from the buttons.
export type UpdatePhase = 'idle' | 'checking' | 'up-to-date' | 'check-failed' | 'installing' | 'install-failed';
