import { useCallback, useState } from 'react';
import type { RelativeRect, Size } from '@/modules/sign/interfaces/geometry';
import type { SignPlacement } from '@/modules/sign/interfaces/placement';
import type { Signature } from '@/modules/sign/interfaces/signature';
import { measureText } from '@/modules/sign/utils/measureText';
import {
  changeFontSize,
  createImagePlacement,
  createTextPlacement,
  duplicatePlacement,
  layoutText,
  repeatOnAllPages,
  resizeText,
} from '@/modules/sign/utils/placements';

interface AddTextParams {
  text : string;
  page : number;
  // Open it for typing right away ("Agregar texto").
  edit : boolean;
}

// A4 until the real sizes are read.
const FALLBACK_SIZE: Size = { width: 595, height: 842 };

// Everything placed on the pages, the selected element and the text being typed.
export const useSignPlacements = (sizes: Size[] | null) => {
  const [placements, setPlacements] = useState<SignPlacement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId]   = useState<string | null>(null);

  const sizeOf = useCallback((page: number): Size => sizes?.[page - 1] ?? FALLBACK_SIZE, [sizes]);

  const update = useCallback((id: string, change: (placement: SignPlacement) => SignPlacement) => {
    setPlacements((previous) => previous.map((placement) => (placement.id === id ? change(placement) : placement)));
  }, []);

  const add = useCallback((placement: SignPlacement) => {
    setPlacements((previous) => [...previous, placement]);
    setSelectedId(placement.id);
  }, []);

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    setEditingId((editing) => (editing === id ? editing : null));
  }, []);

  const addSignature = useCallback((signature: Signature, page: number) => {
    add(createImagePlacement({ signature, page, pageSize: sizeOf(page) }));
  }, [add, sizeOf]);

  const addText = useCallback(({ text, page, edit }: AddTextParams) => {
    const placement = createTextPlacement({ text, page, pageSize: sizeOf(page), measure: measureText });

    add(placement);
    if (edit) setEditingId(placement.id);
  }, [add, sizeOf]);

  const move = useCallback((id: string, rect: RelativeRect) => update(id, (placement) => ({ ...placement, rect })), [update]);

  const resize = useCallback((id: string, rect: RelativeRect) => {
    update(id, (placement) => resizeText({ placement, rect, pageSize: sizeOf(placement.page), measure: measureText }));
  }, [update, sizeOf]);

  const setText = useCallback((id: string, text: string) => {
    update(id, (placement) => {
      if (placement.content.kind !== 'text') return placement;
      return layoutText({ placement: { ...placement, content: { ...placement.content, text } }, pageSize: sizeOf(placement.page), measure: measureText });
    });
  }, [update, sizeOf]);

  const changeFont = useCallback((id: string, delta: number) => {
    update(id, (placement) => changeFontSize({ placement, delta, pageSize: sizeOf(placement.page), measure: measureText }));
  }, [update, sizeOf]);

  const remove = useCallback((id: string) => {
    setPlacements((previous) => previous.filter((placement) => placement.id !== id));
    setSelectedId((selected) => (selected === id ? null : selected));
    setEditingId((editing) => (editing === id ? null : editing));
  }, []);

  const duplicate = useCallback((id: string) => {
    const original = placements.find((placement) => placement.id === id);
    if (original) add(duplicatePlacement(original));
  }, [placements, add]);

  const repeat = useCallback((id: string) => {
    const original = placements.find((placement) => placement.id === id);
    if (!original || !sizes) return;

    setPlacements((previous) => [...previous, ...repeatOnAllPages({ placement: original, pageSizes: sizes, measure: measureText })]);
  }, [placements, sizes]);

  // A deleted signature also leaves the pages.
  const removeSignature = useCallback((signatureId: string) => {
    setPlacements((previous) => previous.filter((placement) => placement.content.kind !== 'image' || placement.content.signatureId !== signatureId));
    setSelectedId(null);
  }, []);

  return {
    placements,
    selectedId,
    editingId,
    select,
    edit        : setEditingId,
    stopEditing : () => setEditingId(null),
    addSignature,
    addText,
    move,
    resize,
    setText,
    changeFont,
    remove,
    duplicate,
    repeat,
    removeSignature,
  };
};
