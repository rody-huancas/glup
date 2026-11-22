import { useCallback, useEffect, useRef, useState } from 'react';
import { readFileBytes } from '@/modules/pdf/services/pdfDocument';
import type { SaveSignatureParams } from '@/modules/sign/interfaces/signPdf';
import type { Signature, SignatureFile } from '@/modules/sign/interfaces/signature';
import { deleteSignature, listSignatures, saveSignature } from '@/modules/sign/services/signatures';
import { imageSize } from '@/modules/sign/utils/signatureImage';

const toSignature = async (file: SignatureFile, bytes?: Uint8Array): Promise<Signature> => {
  const data   = bytes ?? (await readFileBytes(file.path));
  const url    = URL.createObjectURL(new Blob([data.slice().buffer], { type: 'image/png' }));
  const { width, height } = await imageSize(url);

  return { ...file, url, aspect: height / width };
};

// The saved signatures plus the ones made only for this signing, newest first.
export const useSignatures = () => {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const urls                        = useRef(new Set<string>());

  useEffect(() => {
    let active = true;

    void listSignatures()
      .then((files) => Promise.all(files.map((file) => toSignature(file).catch(() => null))))
      .then((list) => {
        const ready = list.filter((item): item is Signature => item !== null);

        if (!active) {
          ready.forEach((item) => URL.revokeObjectURL(item.url));
          return;
        }

        ready.forEach((item) => urls.current.add(item.url));
        setSignatures((previous) => [...previous, ...ready]);
      })
      .catch(() => undefined);

    const created = urls.current;

    return () => {
      active = false;
      created.forEach((url) => URL.revokeObjectURL(url));
      created.clear();
    };
  }, []);

  const add = useCallback(async ({ bytes, keep }: SaveSignatureParams): Promise<Signature> => {
    const signature = await toSignature(await saveSignature({ bytes, keep }), bytes);

    urls.current.add(signature.url);
    setSignatures((previous) => [signature, ...previous]);
    return signature;
  }, []);

  const remove = useCallback(async (signature: Signature) => {
    if (signature.kept) await deleteSignature(signature.id);

    setSignatures((previous) => previous.filter((item) => item.id !== signature.id));
    urls.current.delete(signature.url);
    URL.revokeObjectURL(signature.url);
  }, []);

  return { signatures, savedCount: signatures.filter((item) => item.kept).length, add, remove };
};
