import type { ActionTool } from '@/modules/tools/interfaces/actionTool';
import type { CommandTool } from '@/modules/tools/interfaces/commandTool';
import type { PageTool } from '@/modules/tools/interfaces/pageTool';

export type Tool = ActionTool | PageTool | CommandTool;
