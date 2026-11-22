import { GENERAL_TEXTS } from '@/modules/settings/constants/general';
import { useAutostart } from '@/modules/settings/hooks/useAutostart';
import { Skeleton } from '@/shared/components/Skeleton';
import { Switch } from '@/shared/components/Switch';

export const AutostartToggle = () => {
  const autostart = useAutostart();
  const enabled   = autostart.enabled ?? false;

  if (autostart.enabled === null && !autostart.failed) return <Skeleton className="h-9 w-72" />;

  return (
    <Switch
      label={GENERAL_TEXTS.autostart}
      hint={autostart.failed ? GENERAL_TEXTS.autostartError : enabled ? GENERAL_TEXTS.autostartHint : GENERAL_TEXTS.autostartOffHint}
      checked={enabled}
      disabled={autostart.saving}
      onChange={autostart.change}
    />
  );
};

// Previous version
// export const AutostartToggle = () => {
//   const autostart = useAutostart();
//
//   return (
//     <div className="flex flex-col gap-1">
//       {autostart.enabled === null && !autostart.failed ? (
//         <Skeleton className="h-4 w-64" />
//       ) : (
//         <Switch label={GENERAL_TEXTS.autostart} checked={autostart.enabled ?? false} disabled={autostart.saving} onChange={autostart.change} />
//       )}
//       <p className="pl-9 text-[11px] text-muted">{autostart.failed ? GENERAL_TEXTS.autostartError : GENERAL_TEXTS.autostartHint}</p>
//     </div>
//   );
// };
