import { useEffect, useId, useState } from 'react';
import { GENERAL_TEXTS } from '@/modules/settings/constants/general';
import { useUserName } from '@/modules/settings/hooks/useUserName';

// «¿Cómo te llamo?»: saved when the field is left or with Enter.
export const UserNameSetting = () => {
  const { name, save }    = useUserName();
  const [typed, setTyped] = useState('');
  const id                = useId();

  useEffect(() => {
    setTyped(name ?? '');
  }, [name]);

  const commit = () => {
    if (typed.trim() !== (name ?? '')) save(typed);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="text-[13px] font-semibold text-text">{GENERAL_TEXTS.userName}</label>
        <p className="text-xs text-muted">{GENERAL_TEXTS.userNameHint}</p>
      </div>
      <input
        id={id}
        value={typed}
        maxLength={40}
        placeholder={GENERAL_TEXTS.userNamePlace}
        onChange={(event) => setTyped(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => event.key === 'Enter' && commit()}
        className="h-9 w-48 rounded-control border border-line-strong bg-raised px-3 text-[13px] text-text placeholder:text-muted focus-visible:outline-2 focus-visible:outline-mint"
      />
    </div>
  );
};
