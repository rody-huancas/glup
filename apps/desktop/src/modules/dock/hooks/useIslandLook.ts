import { useCallback, useEffect, useState } from 'react';
import type { IslandModeRequest } from '@/modules/dock/interfaces/islandModeRequest';
import type { TaskbarState } from '@/modules/dock/interfaces/taskbarState';
import { getTaskbarState, setIslandMode } from '@/modules/dock/services/dock';
import { revealDelay } from '@/modules/dock/utils/reveal';
import { useIslandHold } from '@/modules/island/hooks/useIslandHold';
import type { SettingsView } from '@/modules/settings/interfaces/appSettings';
import { getSettings } from '@/modules/settings/services/settings';
import { SETTINGS_CHANGED_EVENT } from '@/shared/constants/events';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';

// Ajustes › "Cómo se muestra": island or hidden, the delay before a hidden Glup comes out, the taskbar
// (to warn when it hides on the same edge) and, the first time it goes hidden, how to bring it back.
export const useIslandLook = () => {
  const [view, setView]       = useState<SettingsView | null>(null);
  const [taskbar, setTaskbar] = useState<TaskbarState | null>(null);
  const [intro, setIntro]     = useState(false);
  const [failed, setFailed]   = useState(false);

  const reload = useCallback(() => {
    void getSettings().then(setView).catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    reload();
    void getTaskbarState().then(setTaskbar).catch(() => undefined);
  }, [reload]);

  useTauriEvent<null>(SETTINGS_CHANGED_EVENT, reload);

  // The notice keeps the island open: hidden, it would go away as soon as the cursor left it.
  useIslandHold(intro);

  const save = useCallback((request: IslandModeRequest) => {
    setFailed(false);
    void setIslandMode(request).catch(() => setFailed(true));
  }, []);

  const choose = useCallback((hidden: boolean) => {
    save({ hidden });
    if (hidden && view && !view.hiddenIntroSeen) setIntro(true);
  }, [save, view]);

  // "Entendido" (or leaving the notice): hidden it stays; "Mejor como isla": back to the island.
  const understood = useCallback(() => {
    setIntro(false);
    save({ introSeen: true });
  }, [save]);

  const backToIsland = useCallback(() => {
    setIntro(false);
    save({ hidden: false, introSeen: true });
  }, [save]);

  return {
    hidden      : view?.islandHidden ?? null,
    delay       : revealDelay(view?.revealDelay ?? null),
    taskbar,
    intro,
    failed,
    choose,
    setDelay    : (ms: number) => save({ revealDelay: ms }),
    understood,
    backToIsland,
  };
};
