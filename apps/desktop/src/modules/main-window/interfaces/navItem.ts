import type { ComponentType } from 'react';
import type { PageId } from '@/modules/main-window/types/pageId';
import type { IconProps } from '@/shared/interfaces/icon';

export interface NavItemDefinition {
  id    : PageId;
  label : string;
  icon  : ComponentType<IconProps>;
}
