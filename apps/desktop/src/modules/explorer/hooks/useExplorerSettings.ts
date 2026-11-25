import { useCallback, useEffect, useState } from 'react';
import { setExplorerMenu, setSendTo } from '@/modules/explorer/services/explorer';
import { getSettings } from '@/modules/settings/services/settings';
import { SETTINGS_CHANGED_EVENT } from '@/shared/constants/events';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';

// The two switches of the Explorer; turning one off takes its entries out at once.
export const useExplorerSettings = () => {
  const [menu, setMenu]     = useState<boolean | null>(null);
  const [sendTo, setSend]   = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);

  const reload = useCallback(() => {
    void getSettings()
      .then((view) => {
        setMenu(!view.explorerMenuOff);
        setSend(!view.sendToOff);
      })
      .catch(() => undefined);
  }, []);

  useEffect(reload, [reload]);
  useTauriEvent<null>(SETTINGS_CHANGED_EVENT, reload);

  const changeMenu = useCallback((enabled: boolean) => {
    setFailed(false);
    setMenu(enabled);
    void setExplorerMenu(enabled).catch(() => {
      setFailed(true);
      reload();
    });
  }, [reload]);

  const changeSendTo = useCallback((enabled: boolean) => {
    setFailed(false);
    setSend(enabled);
    void setSendTo(enabled).catch(() => {
      setFailed(true);
      reload();
    });
  }, [reload]);

  return { menu, sendTo, failed, changeMenu, changeSendTo };
};
