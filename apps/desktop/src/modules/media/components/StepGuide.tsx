import { cx } from '@/shared/utils/classNames';

interface StepGuideProps {
  steps   : string[];
  // From 0.
  current : number;
}

// «1 Escuchar · 2 Revisar · 3 Guardar»: where the person is, in the family's yellow; the steps done
// stay lit a little.
export const StepGuide = ({ steps, current }: StepGuideProps) => (
  <ol className="flex flex-wrap items-center gap-1.5 text-[12px]">
    {steps.map((step, index) => (
      <li key={step} aria-current={index === current ? 'step' : undefined} className="flex items-center gap-1.5">
        {index > 0 && <span aria-hidden className="text-muted">·</span>}
        <span
          className={cx(
            'flex size-5 items-center justify-center rounded-full text-[11px] font-bold tabular-nums',
            index === current ? 'bg-fam-media text-fam-media-ink' : index < current ? 'bg-fam-media-deep text-fam-media' : 'bg-raised text-muted',
          )}
        >
          {index + 1}
        </span>
        <span className={cx('font-semibold', index === current ? 'text-fam-media' : index < current ? 'text-text' : 'text-muted')}>{step}</span>
      </li>
    ))}
  </ol>
);
