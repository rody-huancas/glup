import { AUTO_FOLDERS_TEXTS } from '@/modules/auto-folders/constants/texts';
import { RULE_TEMPLATES } from '@/modules/auto-folders/constants/templates';
import type { RuleTemplate } from '@/modules/auto-folders/interfaces/ruleTemplate';
import { Button } from '@/shared/components/Button';
import { SectionLabel } from '@/shared/components/SectionLabel';

interface TemplatePickerProps {
  onPick    : (template: RuleTemplate) => void;
  onScratch : () => void;
}

// Ready rules to start from, and the way to write one from nothing.
export const TemplatePicker = ({ onPick, onScratch }: TemplatePickerProps) => (
  <section className="flex flex-col gap-3">
    <SectionLabel>{AUTO_FOLDERS_TEXTS.templates}</SectionLabel>
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3">
      {RULE_TEMPLATES.map((template) => (
        <li key={template.id}>
          <button
            type="button"
            onClick={() => onPick(template)}
            className="flex h-full w-full cursor-pointer flex-col gap-1 rounded-[14px] border border-line bg-raised p-3.5 text-left transition-colors hover:border-fam-pc/50 focus-visible:outline-2 focus-visible:outline-fam-pc"
          >
            <span className="text-[13px] font-semibold text-text">{template.title}</span>
            <span className="text-xs text-muted">{template.description}</span>
          </button>
        </li>
      ))}
    </ul>
    <div>
      <Button variant="secondary" onClick={onScratch} className="h-9">{AUTO_FOLDERS_TEXTS.fromScratch}</Button>
    </div>
  </section>
);
