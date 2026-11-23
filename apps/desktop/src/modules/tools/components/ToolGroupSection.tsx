import { ToolCard } from '@/modules/tools/components/ToolCard';
import { TOOL_SECTION_TITLES } from '@/modules/tools/constants/texts';
import type { ToolGroup } from '@/modules/tools/interfaces/toolGroup';
import type { Tool } from '@/modules/tools/types/tool';
import { SectionLabel } from '@/shared/components/SectionLabel';
import { REVEAL_PROPS } from '@/shared/constants/reveal';

interface ToolGroupSectionProps {
  group : ToolGroup;
  onRun : (tool: Tool) => void;
}

export const ToolGroupSection = ({ group, onRun }: ToolGroupSectionProps) => (
  <section className="flex flex-col gap-3">
    <SectionLabel>{TOOL_SECTION_TITLES[group.section]}</SectionLabel>
    <div className="grid grid-cols-3 gap-3">
      {group.tools.map((tool) => (
        <div key={tool.id} {...REVEAL_PROPS.tool} className="flex min-w-0">
          <ToolCard tool={tool} title={tool.title} onRun={onRun} />
        </div>
      ))}
    </div>
  </section>
);
