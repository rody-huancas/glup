import { useEffect, useState } from 'react';
import { greetingLine, greetingName } from '@/modules/home/utils/greeting';
import { getAccountName } from '@/modules/home/services/account';
import { useUserName } from '@/modules/settings/hooks/useUserName';

// The hour is read again now and then, so an open Inicio says «Buenas tardes» when it is time.
const CLOCK_MS = 5 * 60 * 1000;

export const useGreeting = (): string => {
  const { name }              = useUserName();
  const [account, setAccount] = useState<string | null>(null);
  const [hour, setHour]       = useState(() => new Date().getHours());

  useEffect(() => {
    void getAccountName().then(setAccount).catch(() => undefined);
    const timer = window.setInterval(() => setHour(new Date().getHours()), CLOCK_MS);
    return () => window.clearInterval(timer);
  }, []);

  return greetingLine({ hour, name: greetingName({ custom: name, account }) });
};
