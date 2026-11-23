import type { SupportedFileType } from '@/modules/actions/types/fileType';
import type { Tool } from '@/modules/tools/types/tool';

interface AcceptedParams {
  tools  : Tool[];
  // The words for each kind; their order is the order of the list.
  labels : Record<SupportedFileType, string>;
}

const isSupported = (type: string, labels: Record<SupportedFileType, string>): type is SupportedFileType => type in labels;

// The kinds of file some tool works with, from tools.json: a new tool for a new kind shows up here alone.
export const acceptedKinds = ({ tools, labels }: AcceptedParams): string[] => {
  const kinds = new Set(tools.flatMap((tool) => (tool.kind === 'action' && isSupported(tool.fileType, labels) ? [tool.fileType] : [])));
  return (Object.keys(labels) as SupportedFileType[]).filter((kind) => kinds.has(kind)).map((kind) => labels[kind]);
};

// "PDF, imágenes, audio y video"
export const joinWords = (words: string[]): string =>
  words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} y ${words[words.length - 1]}`;
