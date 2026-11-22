import { getFileIcon } from '@/modules/actions/utils/fileIcon';
import type { QuickTool } from '@/modules/home/interfaces/quickTool';
import { Card } from '@/shared/components/Card';

interface QuickToolCardProps {
  tool  : QuickTool;
  onRun : (tool: QuickTool) => void;
}

export const QuickToolCard = ({ tool, onRun }: QuickToolCardProps) => (
  <Card onClick={() => onRun(tool)} className="flex h-[60px] w-full min-w-0 items-center gap-2.5 px-3">
    <img src={getFileIcon(tool.fileType)} alt="" draggable={false} className="size-7 shrink-0 object-contain" />
    <span className="flex min-w-0 flex-col">
      <span className="whitespace-nowrap text-[13px] font-semibold text-text">{tool.title}</span>
      <span className="truncate text-[11px] text-muted">{tool.description}</span>
    </span>
  </Card>
);
