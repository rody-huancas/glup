import { DASHBOARD_TEXTS } from '@/modules/home/constants/dashboard';
import { ToolIcon } from '@/modules/tools/components/ToolIcon';
import type { Tool } from '@/modules/tools/types/tool';
import { SectionLabel } from '@/shared/components/SectionLabel';

interface HomeShortcutsProps {
  tools : Tool[];
  onRun : (tool: Tool) => void;
}

// «Atajos»: four equal cards (two on the narrow panel), the icon in its family's colour and the whole
// name, in two lines when it needs them.
export const HomeShortcuts = ({ tools, onRun }: HomeShortcutsProps) => (
  <section className="flex shrink-0 flex-col gap-2">
    <SectionLabel>{DASHBOARD_TEXTS.shortcuts}</SectionLabel>
    <ul className="grid grid-cols-2 gap-3 @2xl:grid-cols-4">
      {tools.map((tool) => (
        <li key={tool.id} className="min-w-0">
          <button
            type="button"
            onClick={() => onRun(tool)}
            className="flex h-full min-h-14 w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-[14px] border border-line bg-raised px-2.5 py-2 text-left outline-none transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-lilac"
          >
            <span className="shrink-0 scale-[0.85]"><ToolIcon icon={tool.icon} family={tool.family} /></span>
            <span className="min-w-0 text-[12px] leading-tight font-semibold break-words text-text">{tool.title}</span>
          </button>
        </li>
      ))}
    </ul>
  </section>
);
