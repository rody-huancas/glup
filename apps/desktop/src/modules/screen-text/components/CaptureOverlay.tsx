import { SCREEN_TEXT_TEXTS } from '@/modules/screen-text/constants/texts';
import { useCaptureOverlay } from '@/modules/screen-text/hooks/useCaptureOverlay';

// The whole monitor: its still, dimmed except for the zone being chosen (a shadow around it does the
// dimming, so the zone shows the still untouched). Rust shows the window once the still is drawn.
export const CaptureOverlay = () => {
  const overlay = useCaptureOverlay();
  const zone    = overlay.zone;

  return (
    <div
      className="fixed inset-0 cursor-crosshair overflow-hidden bg-bg"
      onPointerDown={overlay.onPointerDown}
      onPointerMove={overlay.onPointerMove}
      onPointerUp={overlay.onPointerUp}
      onContextMenu={overlay.onContextMenu}
    >
      {overlay.stillUrl && (
        <img ref={overlay.imageRef} src={overlay.stillUrl} alt="" draggable={false} onLoad={overlay.onStillLoad} className="absolute inset-0 size-full" />
      )}
      {zone ? (
        <div
          className="absolute border border-mint shadow-[0_0_0_100vmax_var(--color-scrim)]"
          style={{ left: zone.x, top: zone.y, width: zone.width, height: zone.height }}
        />
      ) : (
        <div className="absolute inset-0 bg-scrim" />
      )}
      {!zone && !overlay.choosing && (
        <p role="status" className="pointer-events-none absolute left-1/2 top-8 -translate-x-1/2 rounded-full border border-line-strong bg-surface px-4 py-2 text-[13px] font-semibold text-text shadow-2xl">
          {overlay.codes ? SCREEN_TEXT_TEXTS.qrHint : SCREEN_TEXT_TEXTS.hint}
        </p>
      )}
    </div>
  );
};
