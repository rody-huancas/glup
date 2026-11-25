interface ContainStageProps {
  url    : string;
  // Width over height of the size.
  aspect : number;
  fill   : string;
  blur   : boolean;
}

// «Que entre completa» as it will look: the whole photo in the size's shape, the rest filled.
export const ContainStage = ({ url, aspect, fill, blur }: ContainStageProps) => (
  <div className="flex min-h-0 flex-1 items-center justify-center rounded-control bg-bg p-2">
    <div className="relative max-h-full max-w-full overflow-hidden" style={{ aspectRatio: aspect, height: aspect < 1 ? 'min(60vh, 100%)' : undefined, width: aspect >= 1 ? '100%' : undefined, backgroundColor: blur ? undefined : fill }}>
      {blur && <img src={url} alt="" className="absolute inset-0 size-full scale-110 object-cover blur-xl brightness-[0.85]" />}
      <img src={url} alt="" className="absolute inset-0 size-full object-contain" />
    </div>
  </div>
);
