import { pipeline, type FeatureExtractionPipeline } from "@xenova/transformers";
import { env } from "../../config/env.js";
import type { EmbeddingProvider } from "./embedding-provider.js";
import { resolveLocalModelDimensions } from "./model-config.js";

const extractors = new Map<string, Promise<FeatureExtractionPipeline>>();

function getExtractor(modelId: string): Promise<FeatureExtractionPipeline> {
  let promise = extractors.get(modelId);
  if (!promise) {
    promise = pipeline("feature-extraction", modelId);
    extractors.set(modelId, promise);
  }
  return promise;
}

export class LocalEmbeddingProvider implements EmbeddingProvider {
  readonly modelId: string;
  readonly dimensions: number;

  constructor(modelId = env.localEmbeddingModel) {
    this.modelId = modelId;
    this.dimensions = resolveLocalModelDimensions(modelId);
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const extractor = await getExtractor(this.modelId);
    const vectors: number[][] = [];

    for (const text of texts) {
      const output = await extractor(text, { pooling: "mean", normalize: true });
      vectors.push(Array.from(output.data as Float32Array));
    }

    return vectors;
  }
}
