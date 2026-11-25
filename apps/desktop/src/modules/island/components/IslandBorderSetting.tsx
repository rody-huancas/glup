import { useId } from 'react';
import { LookOption } from '@/modules/dock/components/LookOption';
import { BORDER_TEXTS, ISLAND_BORDERS } from '@/modules/island/constants/border';
import { useIslandBorderSetting } from '@/modules/island/hooks/useIslandBorderSetting';
import { Card } from '@/shared/components/Card';
import { SectionLabel } from '@/shared/components/SectionLabel';
import { Skeleton } from '@/shared/components/Skeleton';

// Ajustes › Apariencia: "Borde de la isla", Suave (by default), Marcado or Sin borde.
export const IslandBorderSetting = () => {
  const { border, choose } = useIslandBorderSetting();
  const titleId            = useId();

  return (
    <section className="flex flex-col gap-2.5">
      <SectionLabel>{BORDER_TEXTS.section}</SectionLabel>
      <Card className="flex flex-col gap-2.5 p-3.5">
        <span className="flex flex-col">
          <span id={titleId} className="text-[11px] leading-5 font-semibold text-text">{BORDER_TEXTS.title}</span>
          <span className="text-[11px] leading-4 text-muted">{BORDER_TEXTS.hint}</span>
        </span>
        {border === null ? (
          <Skeleton className="h-12 w-full max-w-[480px]" />
        ) : (
          <div role="radiogroup" aria-labelledby={titleId} className="flex max-w-[480px] gap-2">
            {ISLAND_BORDERS.map((option) => (
              <LookOption key={option} label={BORDER_TEXTS.options[option].label} hint={BORDER_TEXTS.options[option].hint} selected={border === option} onChoose={() => choose(option)} />
            ))}
          </div>
        )}
      </Card>
    </section>
  );
};
