import { LearnModelStep } from '@/modules/background/components/LearnModelStep';
import { LEARNABLES } from '@/modules/background/constants/learnables';
import type { LearnableId } from '@/modules/background/types/learnableId';
import { AUTO_FOLDERS_TEXTS } from '@/modules/auto-folders/constants/texts';
import type { AutoRule } from '@/modules/auto-folders/interfaces/autoRule';
import { formatRelativeDate } from '@/modules/history/utils/relativeDate';
import { Button } from '@/shared/components/Button';
import { Switch } from '@/shared/components/Switch';
import { useState } from 'react';

interface RuleCardProps {
  rule        : AutoRule;
  now         : Date;
  onToggle    : (enabled: boolean) => void;
  onEdit      : () => void;
  onDuplicate : () => void;
  onRemove    : () => void;
  onCatchUp   : (process: boolean) => void;
  onLearned   : () => void;
}

const isLearnable = (id: string): id is LearnableId => id in LEARNABLES;

// One rule: its sentence, a switch to pause it, what it did and when; what it waits for, with the answer.
export const RuleCard = ({ rule, now, onToggle, onEdit, onDuplicate, onRemove, onCatchUp, onLearned }: RuleCardProps) => {
  const [learning, setLearning]       = useState(false);
  const [downloading, setDownloading] = useState(false);
  const stats = [
    rule.processed > 0 ? AUTO_FOLDERS_TEXTS.processed(rule.processed) : AUTO_FOLDERS_TEXTS.never,
    rule.lastRun ? AUTO_FOLDERS_TEXTS.lastRun(formatRelativeDate(new Date(rule.lastRun).toISOString(), now)) : null,
    rule.waiting > 0 ? AUTO_FOLDERS_TEXTS.waiting(rule.waiting) : null,
  ].filter(Boolean).join(' · ');
  const needs = rule.enabled && rule.needs && isLearnable(rule.needs) ? LEARNABLES[rule.needs] : null;

  return (
    <li className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-raised p-3.5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-text">{rule.name}</p>
          <p className="mt-0.5 text-xs text-muted">{rule.folderName} · {stats}</p>
        </div>
        <div className="shrink-0">
          <Switch label={rule.enabled ? AUTO_FOLDERS_TEXTS.ruleOn : AUTO_FOLDERS_TEXTS.ruleOff} checked={rule.enabled} accent="pc" onChange={onToggle} />
        </div>
      </div>

      {rule.enabled && rule.asking !== null && (
        <div className="flex flex-wrap items-center gap-2 rounded-control bg-fam-pc-dark px-3 py-2">
          <p className="min-w-0 flex-1 text-xs text-text">{AUTO_FOLDERS_TEXTS.asking(rule.asking, rule.folderName)}</p>
          <Button variant="pc" onClick={() => onCatchUp(true)} className="h-8 px-3 text-xs">{AUTO_FOLDERS_TEXTS.askYes}</Button>
          <Button variant="secondary" onClick={() => onCatchUp(false)} className="h-8 px-3 text-xs">{AUTO_FOLDERS_TEXTS.askNo}</Button>
        </div>
      )}

      {needs && !learning && (
        <div className="flex flex-wrap items-center gap-2 rounded-control bg-fam-pc-dark px-3 py-2">
          <p className="min-w-0 flex-1 text-xs text-text">
            {AUTO_FOLDERS_TEXTS.needs}
            {rule.held.length > 0 && ` ${AUTO_FOLDERS_TEXTS.needsHeld(rule.held.length)}.`}
          </p>
          <Button variant="pc" onClick={() => setLearning(true)} className="h-8 px-3 text-xs">{AUTO_FOLDERS_TEXTS.needsShow}</Button>
        </div>
      )}
      {needs && learning && (
        <LearnModelStep
          learnable={needs}
          downloading={downloading}
          onStarted={() => setDownloading(true)}
          onStopped={() => setDownloading(false)}
          onReady={() => {
            setDownloading(false);
            setLearning(false);
            onLearned();
          }}
          onBack={() => setLearning(false)}
        />
      )}

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onEdit} className="h-8 px-3 text-xs">{AUTO_FOLDERS_TEXTS.edit}</Button>
        <Button variant="secondary" onClick={onDuplicate} className="h-8 px-3 text-xs">{AUTO_FOLDERS_TEXTS.duplicate}</Button>
        <Button variant="danger" onClick={onRemove} className="h-8 px-3 text-xs">{AUTO_FOLDERS_TEXTS.remove}</Button>
      </div>
    </li>
  );
};
