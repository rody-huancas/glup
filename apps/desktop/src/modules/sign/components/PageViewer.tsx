import type { PlacementActions } from '@/modules/sign/components/PlacementItem';
import { PlacementLayer } from '@/modules/sign/components/PlacementLayer';
import { ViewerToolbar } from '@/modules/sign/components/ViewerToolbar';
import { SIGN_TEXTS } from '@/modules/sign/constants/sign';
import { useElementSize } from '@/modules/sign/hooks/useElementSize';
import { usePageCanvas } from '@/modules/sign/hooks/usePageCanvas';
import { useViewerZoom } from '@/modules/sign/hooks/useViewerZoom';
import type { Size } from '@/modules/sign/interfaces/geometry';
import type { SignPlacement } from '@/modules/sign/interfaces/placement';
import { Skeleton } from '@/shared/components/Skeleton';

interface PageViewerProps {
  path       : string;
  name       : string;
  page       : number;
  total      : number;
  // The current page in points, once read.
  pageSize   : Size | null;
  failed     : boolean;
  placements : SignPlacement[];
  selectedId : string | null;
  editingId  : string | null;
  actions    : PlacementActions;
  onClear    : () => void;
  onGoTo     : (page: number) => void;
}

// The current page with pdf.js, fitted to the available height by default, and what is placed on it.
export const PageViewer = ({ path, name, page, total, pageSize, failed, placements, selectedId, editingId, actions, onClear, onGoTo }: PageViewerProps) => {
  const viewport  = useElementSize<HTMLDivElement>();
  const zoom      = useViewerZoom({ pageSize, viewport: viewport.size });
  const canvasRef = usePageCanvas({ path, page, scale: zoom.scale });
  const view      = pageSize ? { width: pageSize.width * zoom.scale, height: pageSize.height * zoom.scale } : null;

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-2">
      <ViewerToolbar name={name} page={page} total={total} zoom={zoom} onPrevious={() => onGoTo(page - 1)} onNext={() => onGoTo(page + 1)} />
      <div ref={viewport.ref} className="scroll-thin flex min-h-0 flex-1 overflow-auto rounded-control bg-bg p-4">
        {failed && <p className="m-auto text-[13px] text-muted">{SIGN_TEXTS.unreadable}</p>}
        {!failed && !view && <Skeleton className="m-auto h-full w-[70%]" />}
        {view && (
          <div className="relative m-auto shrink-0 bg-white shadow-lg" style={{ width: view.width, height: view.height }}>
            <div ref={canvasRef} className="absolute inset-0" />
            <PlacementLayer placements={placements} view={view} selectedId={selectedId} editingId={editingId} actions={actions} onClear={onClear} />
          </div>
        )}
      </div>
    </section>
  );
};
