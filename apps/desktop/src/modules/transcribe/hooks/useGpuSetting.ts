import { useCallback, useEffect, useState } from 'react';
import type { SettingsView } from '@/modules/settings/interfaces/appSettings';
import { getSettings, updateSettings } from '@/modules/settings/services/settings';
import type { TranscribeEngine } from '@/modules/transcribe/interfaces/transcribeEngine';
import { getTranscribeEngine } from '@/modules/transcribe/services/transcribe';
import type { GpuMode } from '@/modules/transcribe/types/gpuMode';
import { SETTINGS_CHANGED_EVENT } from '@/shared/constants/events';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';

// "Usar la tarjeta de video": the mode lives in settings.json; who listens is asked to Rust, again
// whenever the settings change (a card that failed is written there too).
export const useGpuSetting = () => {
  const [view, setView]     = useState<SettingsView | null>(null);
  const [engine, setEngine] = useState<TranscribeEngine | null>(null);

  const reload = useCallback(() => {
    void getSettings().then(setView).catch(() => undefined);
    void getTranscribeEngine().then(setEngine).catch(() => undefined);
  }, []);

  useEffect(reload, [reload]);
  useTauriEvent<null>(SETTINGS_CHANGED_EVENT, reload);

  const choose = useCallback((mode: GpuMode) => {
    if (!view || view.transcribeGpu === mode) return;
    setEngine(null);
    void updateSettings({ ...view, transcribeGpu: mode }).then(setView).catch(() => undefined);
  }, [view]);

  return { mode: view?.transcribeGpu ?? null, engine, choose };
};
