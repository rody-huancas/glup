import { HOME_TEXTS } from '@/modules/home/constants/home';
import { REVEAL_PROPS } from '@/shared/constants/reveal';

export const TipCard = () => (
  <aside {...REVEAL_PROPS.card} className="rounded-[14px] bg-[#262236] p-3">
    <p className="text-[13px] font-semibold text-lilac-soft">{HOME_TEXTS.tipTitle}</p>
    <p className="mt-1 text-xs leading-relaxed text-[#D6D3E3]">{HOME_TEXTS.tipText}</p>
  </aside>
);
