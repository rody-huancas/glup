import { QuickToolCard } from '@/modules/home/components/QuickToolCard';
import { HOME_TEXTS } from '@/modules/home/constants/home';
import { QUICK_TOOLS } from '@/modules/tools/constants/tools';
import type { ActionTool } from '@/modules/tools/interfaces/actionTool';
import { SectionLabel } from '@/shared/components/SectionLabel';
import { REVEAL_PROPS } from '@/shared/constants/reveal';

interface QuickToolsProps {
  onRun: (tool: ActionTool) => void;
}

// Runs through the home flow so the result shows in the panel, like a drop.
export const QuickTools = ({ onRun }: QuickToolsProps) => {
  return (
    <section className="flex shrink-0 flex-col gap-3">
      <SectionLabel>{HOME_TEXTS.quickTools}</SectionLabel>
      <div className="grid grid-cols-3 gap-3">
        {QUICK_TOOLS.map((tool) => (
          <div key={tool.id} {...REVEAL_PROPS.tool} className="flex min-w-0">
            <QuickToolCard tool={tool} onRun={onRun} />
          </div>
        ))}
      </div>
    </section>
  );
};
