import { QuickToolCard } from '@/modules/home/components/QuickToolCard';
import { HOME_TEXTS } from '@/modules/home/constants/home';
import { QUICK_TOOLS } from '@/modules/home/constants/quickTools';
import { useQuickTools } from '@/modules/home/hooks/useQuickTools';
import { SectionLabel } from '@/shared/components/SectionLabel';
import { REVEAL_PROPS } from '@/shared/constants/reveal';

export const QuickTools = () => {
  const { runTool } = useQuickTools();

  return (
    <section className="flex flex-col gap-2.5">
      <SectionLabel>{HOME_TEXTS.quickTools}</SectionLabel>
      <div className="grid grid-cols-3 gap-2">
        {QUICK_TOOLS.map((tool) => (
          <div key={tool.id} {...REVEAL_PROPS.tool} className="flex min-w-0">
            <QuickToolCard tool={tool} onRun={(selected) => void runTool(selected)} />
          </div>
        ))}
      </div>
    </section>
  );
};
