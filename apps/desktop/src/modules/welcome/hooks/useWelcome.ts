import { useCallback, useEffect, useState } from 'react';
import { getSettings, updateSettings } from '@/modules/settings/services/settings';
import { getLaunchInfo, setAutostart } from '@/modules/settings/services/startup';
import type { WelcomeState } from '@/modules/welcome/interfaces/welcomeState';
import { shouldShowWelcome } from '@/modules/welcome/utils/welcome';

interface UseWelcomeParams {
  onDone: () => void;
}

// The first-run welcome: decided once at start; answering saves the choice and never shows it again.
export const useWelcome = ({ onDone }: UseWelcomeParams): WelcomeState => {
  const [welcomeSeen, setWelcomeSeen] = useState<boolean | null>(null);
  const [autostart, setLaunchedAuto]  = useState<boolean | null>(null);

  useEffect(() => {
    void getSettings().then((view) => setWelcomeSeen(view.welcomeSeen)).catch(() => setWelcomeSeen(true));
    void getLaunchInfo().then((info) => setLaunchedAuto(info.autostart)).catch(() => setLaunchedAuto(true));
  }, []);

  const answer = useCallback((enable: boolean) => {
    setWelcomeSeen(true);
    onDone();

    void setAutostart(enable).catch(() => undefined);
    void getSettings()
      .then((view) => updateSettings({ ...view, welcomeSeen: true }))
      .catch(() => undefined);
  }, [onDone]);

  return { visible: shouldShowWelcome({ welcomeSeen, autostart }), answer };
};
