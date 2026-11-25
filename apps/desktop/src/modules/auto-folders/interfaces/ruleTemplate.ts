import type { RuleDraft } from '@/modules/auto-folders/interfaces/ruleDraft';

// A rule ready to start from («Ordenar Descargas»); its folder is Descargas.
export interface RuleTemplate {
  id          : string;
  title       : string;
  description : string;
  draft       : Omit<RuleDraft, 'id' | 'folder' | 'name' | 'enabled'>;
}
