import { MAIN_WINDOW_TEXTS } from '@/modules/main-window/constants/mainWindow';
import { Card } from '@/shared/components/Card';

export const PrivacyCard = () => (
  <Card tone="surface" className="p-3.5">
    <p className="text-[13px] font-semibold text-text">{MAIN_WINDOW_TEXTS.privacyTitle}</p>
    <p className="mt-0.5 text-xs text-muted">{MAIN_WINDOW_TEXTS.privacyText}</p>
  </Card>
);
