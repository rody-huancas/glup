import { ShortcutSummary } from '@/modules/shortcuts/components/ShortcutSummary';
import type { ShortcutTarget } from '@/modules/shortcuts/types/shortcutTarget';
import { ToolCard } from '@/modules/tools/components/ToolCard';
import type { Tool } from '@/modules/tools/types/tool';
import { REVEAL_PROPS } from '@/shared/constants/reveal';

interface ToolGridProps {
  tools            : Tool[];
  onRun            : (tool: Tool) => void;
  // "Cambiar" on the cards with a shortcut (Copiar texto de la pantalla, Portapapeles).
  onChangeShortcut : (target: ShortcutTarget) => void;
}

// As many columns as fit the panel (never narrower than a readable card), so nothing spills out.
export const ToolGrid = ({ tools, onRun, onChangeShortcut }: ToolGridProps) => (
  <div className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-3">
    {tools.map((tool) => (
      <div key={tool.id} {...REVEAL_PROPS.tool} className="flex min-w-0">
        <ToolCard tool={tool} title={tool.title} onRun={onRun} footer={tool.shortcut ? <ShortcutSummary target={tool.shortcut} onChange={onChangeShortcut} /> : undefined} />
      </div>
    ))}
  </div>
);
