import { useCallback, useEffect, useState } from 'react';
import type { FileInfo } from '@/modules/actions/interfaces/fileInfo';
import type { SettingsView } from '@/modules/settings/interfaces/appSettings';
import { getSettings, updateSettings } from '@/modules/settings/services/settings';
import { estimateTranscription } from '@/modules/transcribe/services/transcribe';
import type { TranscribeLanguage } from '@/modules/transcribe/types/transcribeLanguage';
import type { TranscribeLevel } from '@/modules/transcribe/types/transcribeLevel';
import { estimateText, totalSeconds } from '@/modules/transcribe/utils/transcribe';

// The choices of the step: the language, and the level (remembered in settings.json for next time).
export const useTranscribeStep = (files: FileInfo[]) => {
  const [language, setLanguage] = useState<TranscribeLanguage>('auto');
  const [other, setOther]       = useState<TranscribeLanguage>('fr');
  const [level, setLevelState]  = useState<TranscribeLevel>('fast');
  const [settings, setSettings] = useState<SettingsView | null>(null);
  const [estimate, setEstimate] = useState<string | null>(null);
  const seconds                 = totalSeconds(files);

  useEffect(() => {
    void getSettings()
      .then((view) => {
        setSettings(view);
        setLevelState(view.transcribeLevel);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (seconds === null) return setEstimate(null);

    let active = true;
    void estimateTranscription(level, seconds).then((wait) => active && setEstimate(estimateText(wait))).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [level, seconds]);

  const setLevel = useCallback((next: TranscribeLevel) => {
    setLevelState(next);
    if (settings && settings.transcribeLevel !== next) void updateSettings({ ...settings, transcribeLevel: next }).then(setSettings).catch(() => undefined);
  }, [settings]);

  return { language, setLanguage, other, setOther, level, setLevel, estimate };
};
