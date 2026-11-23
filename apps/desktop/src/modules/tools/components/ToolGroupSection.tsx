import { ShortcutSummary } from '@/modules/screen-text/components/ShortcutSummary';
import { ToolCard } from '@/modules/tools/components/ToolCard';
import { TOOL_SECTION_TITLES } from '@/modules/tools/constants/texts';
import type { ToolGroup } from '@/modules/tools/interfaces/toolGroup';
import type { Tool } from '@/modules/tools/types/tool';
import { SectionLabel } from '@/shared/components/SectionLabel';
import { REVEAL_PROPS } from '@/shared/constants/reveal';

interface ToolGroupSectionProps {
  group            : ToolGroup;
  onRun            : (tool: Tool) => void;
  // "Cambiar" on the card of Copiar texto de la pantalla.
  onChangeShortcut : () => void;
}

// As many columns as fit the panel (never narrower than a readable card), so no section spills out.
export const ToolGroupSection = ({ group, onRun, onChangeShortcut }: ToolGroupSectionProps) => (
  <section className="flex flex-col gap-3">
    <SectionLabel>{TOOL_SECTION_TITLES[group.section]}</SectionLabel>
    <div className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-3">
      {group.tools.map((tool) => (
        <div key={tool.id} {...REVEAL_PROPS.tool} className="flex min-w-0">
          <ToolCard tool={tool} title={tool.title} onRun={onRun} footer={tool.kind === 'command' ? <ShortcutSummary onChange={onChangeShortcut} /> : undefined} />
        </div>
      ))}
    </div>
  </section>
);
