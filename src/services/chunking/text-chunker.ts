export type TextChunk = {
  index: number;
  text: string;
};

export function chunkText(
  text: string,
  options: { chunkSize?: number; overlap?: number } = {},
): TextChunk[] {
  const chunkSize = options.chunkSize ?? 1000;
  const overlap = options.overlap ?? 200;
  const normalized = text.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return [];
  }

  if (normalized.length <= chunkSize) {
    return [{ index: 0, text: normalized }];
  }

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    chunks.push({ index, text: normalized.slice(start, end) });
    index += 1;
    if (end >= normalized.length) {
      break;
    }
    start = Math.max(0, end - overlap);
  }

  return chunks;
}
