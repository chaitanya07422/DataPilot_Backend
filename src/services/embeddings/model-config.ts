/** Known local Hugging Face / Xenova models and their vector sizes. */
export const LOCAL_EMBEDDING_MODEL_DIMENSIONS: Record<string, number> = {
  "Xenova/all-MiniLM-L6-v2": 384,
  "Xenova/all-mpnet-base-v2": 768,
  "Xenova/bge-base-en-v1.5": 768,
};

export function resolveLocalModelDimensions(modelId: string): number {
  const dimensions = LOCAL_EMBEDDING_MODEL_DIMENSIONS[modelId];
  if (!dimensions) {
    throw new Error(
      `Unknown LOCAL_EMBEDDING_MODEL "${modelId}". Add it to LOCAL_EMBEDDING_MODEL_DIMENSIONS or use a listed model.`,
    );
  }
  return dimensions;
}
