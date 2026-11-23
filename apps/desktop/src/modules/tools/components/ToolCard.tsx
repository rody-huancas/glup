import { ToolIcon } from '@/modules/tools/components/ToolIcon';
import type { Tool } from '@/modules/tools/types/tool';
import { Card } from '@/shared/components/Card';

interface ToolCardProps<T extends Tool> {
  tool  : T;
  title : string;
  onRun : (tool: T) => void;
}

// Names stay on one line; descriptions end with "…". Same card in Inicio and Herramientas.
export const ToolCard = <T extends Tool>({ tool, title, onRun }: ToolCardProps<T>) => (
  <Card onClick={() => onRun(tool)} className="flex h-[68px] w-full min-w-0 items-center gap-3 px-3.5">
    <ToolIcon icon={tool.icon} />
    <span className="flex min-w-0 flex-col">
      <span className="whitespace-nowrap text-sm font-semibold text-text">{title}</span>
      <span className="truncate text-xs text-muted">{tool.description}</span>
    </span>
  </Card>
);
