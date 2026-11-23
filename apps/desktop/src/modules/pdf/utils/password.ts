import { MIN_PASSWORD, PROTECT_TEXTS } from '@/modules/pdf/constants/protect';

interface NewPasswordParams {
  password : string;
  confirm  : string;
}

// Characters, not bytes: "ñandú" has 5.
export const isLongEnough = (password: string): boolean => [...password].length >= MIN_PASSWORD;

// Why "Proteger PDF" cannot go on yet, or null. Nothing is said while the second field is still empty.
export const newPasswordProblem = ({ password, confirm }: NewPasswordParams): string | null => {
  if (!isLongEnough(password)) return password.length === 0 ? null : PROTECT_TEXTS.tooShort;
  if (confirm.length > 0 && confirm !== password) return PROTECT_TEXTS.different;
  return null;
};

export const canProtect = ({ password, confirm }: NewPasswordParams): boolean => isLongEnough(password) && password === confirm;
