export interface WelcomeState {
  visible : boolean;
  // "Sí, abrir al encender" (true) or "Ahora no" (false): saved, then Inicio.
  answer  : (autostart: boolean) => void;
}
