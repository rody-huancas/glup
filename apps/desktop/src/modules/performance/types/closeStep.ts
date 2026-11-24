// The "Cerrar" dialog: asking, closing (waiting for it), the app did not close (offer "Forzar"), forcing.
export type CloseStep = 'confirm' | 'closing' | 'stuck' | 'forcing';
