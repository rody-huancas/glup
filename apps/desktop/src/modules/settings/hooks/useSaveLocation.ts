import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReduceLevel } from '@/modules/pdf/types/reduceLevel';
import { DEFAULT_SETTINGS } from '@/modules/settings/constants/saveLocation';
import type { AppSettings, SaveDestination, SettingsView } from '@/modules/settings/interfaces/appSettings';
import type { SaveLocation } from '@/modules/settings/interfaces/saveLocation';
import { getSettings, pickFolder, updateSettings } from '@/modules/settings/services/settings';
import type { SaveMode } from '@/modules/settings/types/saveMode';
import { SETTINGS_CHANGED_EVENT } from '@/shared/constants/events';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';

// Where results are saved; remembered by Rust between uses and shared by the panel and Settings.
export const useSaveLocation = (): SaveLocation => {
  const [view, setView]       = useState<SettingsView>(DEFAULT_SETTINGS);
  const [picking, setPicking] = useState(false);

  const reload = useCallback(() => {
    void getSettings().then(setView).catch(() => undefined);
  }, []);

  useEffect(reload, [reload]);
  useTauriEvent<null>(SETTINGS_CHANGED_EVENT, reload);

  const save = useCallback((settings: AppSettings) => {
    void updateSettings(settings).then(setView).catch(() => undefined);
  }, []);

  // "Elegir carpeta…" always opens the folder dialog, starting at the last folder chosen.
  const choose = useCallback((mode: SaveMode) => {
    if (mode !== 'custom') {
      save({ ...view, saveMode: mode });
      return;
    }

    setPicking(true);
    void pickFolder(view.customFolder)
      .then((folder) => {
        if (folder) save({ ...view, saveMode: 'custom', customFolder: folder });
      })
      .finally(() => setPicking(false));
  }, [view, save]);

  const setBundleZip = useCallback((bundle: boolean) => {
    save({ ...view, bundleZip: bundle });
  }, [view, save]);

  const setReduceLevel = useCallback((level: ReduceLevel) => {
    if (level !== view.reduceLevel) save({ ...view, reduceLevel: level });
  }, [view, save]);

  const destination = useMemo<SaveDestination>(
    () => ({ mode: view.saveMode, folder: view.saveMode === 'custom' ? view.customFolder : null }),
    [view.saveMode, view.customFolder],
  );

  return {
    mode          : view.saveMode,
    customFolder  : view.customFolder,
    folderMissing : view.folderMissing,
    picking,
    destination,
    bundleZip     : view.bundleZip,
    reduceLevel   : view.reduceLevel,
    choose,
    setBundleZip,
    setReduceLevel,
  };
};
