import { useId } from 'react';
import type { ReactNode } from 'react';
import { FAMILY_STYLES } from '@/modules/families/constants/families';
import { ToolIcon } from '@/modules/tools/components/ToolIcon';
import type { Tool } from '@/modules/tools/types/tool';
import { cx } from '@/shared/utils/classNames';

interface ToolCardProps<T extends Tool> {
  tool    : T;
  title   : string;
  onRun   : (tool: T) => void;
  // Something of its own under the description, with its own controls (the shortcut of a command tool).
  footer? : ReactNode;
}

// Same card in a family's screen and in Herramientas, with the icon in the family's color. The name wraps to a second line instead of spilling out; the
// description ends with "…" and shows whole on hover (title) and to screen readers (it is all in the
// page, only cut on screen). The name's button stretches over the whole card, so the footer can hold
// buttons of its own without nesting them inside another button.
export const ToolCard = <T extends Tool>({ tool, title, onRun, footer }: ToolCardProps<T>) => {
  const descriptionId = useId();

  return (
    <div
      className={cx(
        'relative flex min-h-[68px] w-full min-w-0 items-center gap-3 rounded-[14px] border border-line bg-raised px-3.5 py-3 transition-colors has-[>span>button:focus-visible]:outline-2 has-[>span>button:focus-visible]:outline-offset-2 has-[>span>button:focus-visible]:outline-lilac',
        FAMILY_STYLES[tool.family].edge,
      )}
    >
      <ToolIcon icon={tool.icon} family={tool.family} />
      <span className="flex min-w-0 flex-1 flex-col">
        <button
          type="button"
          onClick={() => onRun(tool)}
          aria-describedby={descriptionId}
          className="cursor-pointer text-left text-sm leading-snug font-semibold text-text after:absolute after:inset-0 after:rounded-[14px] focus-visible:outline-none"
        >
          <span className="line-clamp-2 break-words">{title}</span>
        </button>
        <span id={descriptionId} title={tool.description} className="truncate text-xs text-muted">
          {tool.description}
        </span>
        {footer && <span className="relative z-10 mt-1 flex min-w-0 items-center gap-2">{footer}</span>}
      </span>
    </div>
  );
};
