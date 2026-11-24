import { useId } from 'react';
import { GpuModeOption } from '@/modules/transcribe/components/GpuModeOption';
import { GPU_MODE_TEXTS, GPU_TEXTS } from '@/modules/transcribe/constants/gpu';
import { useGpuSetting } from '@/modules/transcribe/hooks/useGpuSetting';
import type { GpuMode } from '@/modules/transcribe/types/gpuMode';
import { engineLine } from '@/modules/transcribe/utils/gpu';
import { Card } from '@/shared/components/Card';
import { SectionLabel } from '@/shared/components/SectionLabel';
import { Skeleton } from '@/shared/components/Skeleton';

const MODES: GpuMode[] = ['auto', 'never'];

// Ajustes › "Pasar audio a texto": Automático or Nunca, and under it who listens now.
export const GpuSetting = () => {
  const titleId                = useId();
  const { mode, engine, choose } = useGpuSetting();

  return (
    <section className="flex flex-col gap-2.5">
      <SectionLabel>{GPU_TEXTS.section}</SectionLabel>
      <Card className="flex flex-col gap-2.5 p-3.5">
        <div className="flex flex-col">
          <span id={titleId} className="text-[13px] font-semibold text-text">{GPU_TEXTS.title}</span>
          <span className="text-[11px] text-muted">{GPU_TEXTS.hint}</span>
        </div>
        {mode === null ? (
          <Skeleton className="h-12 w-full max-w-[420px]" />
        ) : (
          <div role="radiogroup" aria-labelledby={titleId} className="flex max-w-[420px] gap-2">
            {MODES.map((option) => (
              <GpuModeOption key={option} label={GPU_MODE_TEXTS[option].label} hint={GPU_MODE_TEXTS[option].hint} selected={mode === option} onChoose={() => choose(option)} />
            ))}
          </div>
        )}
        <p role="status" className="text-[12px] text-muted">{engine ? engineLine(engine.engine) : GPU_TEXTS.checking}</p>
      </Card>
    </section>
  );
};
