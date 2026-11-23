import { ToolCard } from '@/modules/tools/components/ToolCard';
import type { ActionTool } from '@/modules/tools/interfaces/actionTool';

interface QuickToolCardProps {
  tool  : ActionTool;
  onRun : (tool: ActionTool) => void;
}

// The card of Herramientas, with the longer name Inicio needs (there are no sections to say "PDF").
export const QuickToolCard = ({ tool, onRun }: QuickToolCardProps) => (
  <ToolCard tool={tool} title={tool.quickTitle ?? tool.title} onRun={onRun} />
);
