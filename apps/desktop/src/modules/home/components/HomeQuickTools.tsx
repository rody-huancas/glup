import { DASHBOARD_TEXTS } from '@/modules/home/constants/dashboard';
import { ToolIcon } from '@/modules/tools/components/ToolIcon';
import type { Tool } from '@/modules/tools/types/tool';
import { SectionLabel } from '@/shared/components/SectionLabel';

interface HomeQuickToolsProps {
  tools     : Tool[];
  // Favorites, or (without any) the most used.
  favorites : boolean;
  onRun     : (tool: Tool) => void;
}

// "Accesos rápidos": up to four tools that run like their card in Habilidades; a long name takes two
// lines instead of being cut.
export const HomeQuickTools = ({ tools, favorites, onRun }: HomeQuickToolsProps) => (
  <section className="flex min-w-0 flex-col gap-2">
    <SectionLabel>{favorites || tools.length === 0 ? DASHBOARD_TEXTS.quick : DASHBOARD_TEXTS.quickUsed}</SectionLabel>
    {tools.length === 0 ? (
      <p className="rounded-[14px] border border-dashed border-line-strong px-3.5 py-3 text-[12px] text-muted">{DASHBOARD_TEXTS.quickEmpty}</p>
    ) : (
      <ul className="flex flex-col gap-1.5">
        {tools.map((tool) => (
          <li key={tool.id}>
            <button
              type="button"
              onClick={() => onRun(tool)}
              className="flex min-h-11 w-full min-w-0 cursor-pointer items-center gap-2 rounded-[12px] border border-line bg-raised py-1 pr-2 pl-1 text-left outline-none transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-lilac"
            >
              <span className="shrink-0 scale-[0.8]"><ToolIcon icon={tool.icon} family={tool.family} /></span>
              <span className="line-clamp-2 min-w-0 text-[12px] leading-tight font-semibold break-words text-text">{tool.title}</span>
            </button>
          </li>
        ))}
      </ul>
    )}
  </section>
);
