import { useCallback, useEffect, useRef, useState } from 'react';
import { revealFile } from '@/modules/actions/services/files';
import { COPIED_TIME } from '@/modules/text/constants/text';
import type { ExtractedText } from '@/modules/text/interfaces/extractedText';
import { saveText } from '@/modules/text/services/text';
import { saveSubtitles } from '@/modules/transcribe/services/transcribe';

// "Copiar todo" (with a moment of "Copiado") and "Guardar como .txt" (then "Ver en carpeta").
export const useTextResult = (extracted: ExtractedText) => {
  const [copied, setCopied]       = useState(false);
  const [copyFailed, setCopyFail] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [saveFailed, setSaveFail] = useState(false);
  const [srtPath, setSrtPath]     = useState<string | null>(null);
  const timer                     = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(() => {
    setCopyFail(false);
    void navigator.clipboard
      .writeText(extracted.text)
      .then(() => {
        setCopied(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), COPIED_TIME);
      })
      .catch(() => setCopyFail(true));
  }, [extracted.text]);

  const save = useCallback(() => {
    if (saving || savedPath) return;

    setSaving(true);
    setSaveFail(false);
    void saveText(extracted)
      .then(setSavedPath)
      .catch(() => setSaveFail(true))
      .finally(() => setSaving(false));
  }, [extracted, saving, savedPath]);

  const saveSrt = useCallback(() => {
    if (!extracted.subtitles || srtPath) return;

    setSaveFail(false);
    void saveSubtitles({ paths: extracted.paths, subtitles: extracted.subtitles, destination: extracted.destination })
      .then(setSrtPath)
      .catch(() => setSaveFail(true));
  }, [extracted, srtPath]);

  const reveal = useCallback(() => {
    if (savedPath) void revealFile(savedPath);
  }, [savedPath]);

  return { copied, copyFailed, copy, saving, savedPath, saveFailed, save, reveal, srtPath, saveSrt };
};
