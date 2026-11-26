import { GREETING_HOURS, GREETING_TEXTS } from '@/modules/home/constants/greeting';

interface GreetingNameParams {
  // «¿Cómo te llamo?» in Ajustes.
  custom  : string | null;
  // The name the Windows account shows.
  account : string | null;
}

interface GreetingParams {
  hour : number;
  name : string | null;
}

export const greetingFor = (hour: number): string => {
  if (hour >= GREETING_HOURS.morning && hour < GREETING_HOURS.afternoon) return GREETING_TEXTS.morning;
  if (hour >= GREETING_HOURS.afternoon && hour < GREETING_HOURS.night) return GREETING_TEXTS.afternoon;
  return GREETING_TEXTS.night;
};

// «Rody Huancas» → «Rody».
export const firstName = (full: string | null): string | null => full?.trim().split(/\s+/)[0] || null;

// «RODY» or «rody» → «Rody» (each word); a name already mixed («McDonald», «DeLuca») stays as written.
export const tidyName = (name: string): string => {
  const same = name === name.toUpperCase() || name === name.toLowerCase();
  if (!same) return name;
  return name.split(/(\s+)/).map((word) => word.charAt(0).toLocaleUpperCase('es') + word.slice(1).toLocaleLowerCase('es')).join('');
};

// What the person wrote in Ajustes, whole; if nothing, the first name of the account; if none, no name.
export const greetingName = ({ custom, account }: GreetingNameParams): string | null => {
  const name = custom?.trim() || firstName(account);
  return name ? tidyName(name) : null;
};

// «¡Buenos días, Rody!» or «¡Buenas noches!».
export const greetingLine = ({ hour, name }: GreetingParams): string => `¡${greetingFor(hour)}${name ? `, ${name}` : ''}!`;
