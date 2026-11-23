// import { getFileIcon } from '@/modules/actions/utils/fileIcon';
// import type { QuickTool } from '@/modules/home/interfaces/quickTool';
// import { Card } from '@/shared/components/Card';
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

// Names stay on one line; descriptions end with "…".
// export const QuickToolCard = ({ tool, onRun }: QuickToolCardProps) => (
//   <Card onClick={() => onRun(tool)} className="flex h-[68px] w-full min-w-0 items-center gap-3 px-3.5">
//     <img src={getFileIcon(tool.fileType)} alt="" draggable={false} className="size-9 shrink-0 object-contain" />
//     <span className="flex min-w-0 flex-col">
//       <span className="whitespace-nowrap text-sm font-semibold text-text">{tool.title}</span>
//       <span className="truncate text-xs text-muted">{tool.description}</span>
//     </span>
//   </Card>
// );

// 76 px cards, 40 px icon, 15/13 px text, long names wrapping to a second line.
// export const QuickToolCard = ({ tool, onRun }: QuickToolCardProps) => (
//   <Card onClick={() => onRun(tool)} className="flex h-[76px] w-full min-w-0 items-center gap-3 px-3.5">
//     <img src={getFileIcon(tool.fileType)} alt="" draggable={false} className="size-10 shrink-0 object-contain" />
//     <span className="flex min-w-0 flex-col">
//       <span className="line-clamp-2 text-[15px] font-semibold leading-tight text-text">{tool.title}</span>
//       <span className="truncate text-[13px] text-muted">{tool.description}</span>
//     </span>
//   </Card>
// );
