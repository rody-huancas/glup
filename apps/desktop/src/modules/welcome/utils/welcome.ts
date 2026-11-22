interface ShowWelcomeParams {
  // Null while the settings are still being read.
  welcomeSeen : boolean | null;
  // Null while the launch info is still being read.
  autostart   : boolean | null;
}

// Only on a first run (no settings.json yet), and never when Windows started Glup by itself: then it
// stays the quiet pill.
export const shouldShowWelcome = ({ welcomeSeen, autostart }: ShowWelcomeParams): boolean =>
  welcomeSeen === false && autostart === false;
