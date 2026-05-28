import OpenAI from "openai";
import type { EmbeddingProvider } from "./embedding-provider.js";

const DEFAULT_OPENAI_DIMENSIONS: Record<string, number> = {
  "text-embedding-3-small": 1536,
  "text-embedding-3-large": 3072,
  "text-embedding-ada-002": 1536,
};

const MATRYOSHKA_MODELS = new Set(["text-embedding-3-small", "text-embedding-3-large"]);

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly modelId: string;
  readonly dimensions: number;
  private readonly client: OpenAI;
  private readonly requestDimensions?: number;

  constructor(apiKey: string, modelId: string, dimensions?: number) {
    this.client = new OpenAI({ apiKey });
    this.modelId = modelId;
    this.requestDimensions = dimensions;

    if (dimensions !== undefined) {
      if (!MATRYOSHKA_MODELS.has(modelId)) {
        throw new Error(
          `Custom dimensions (${dimensions}) require text-embedding-3-small or text-embedding-3-large`,
        );
      }
      this.dimensions = dimensions;
    } else {
      this.dimensions = DEFAULT_OPENAI_DIMENSIONS[modelId] ?? 1536;
    }
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const response = await this.client.embeddings.create({
      model: this.modelId,
      input: texts,
      ...(this.requestDimensions !== undefined
        ? { dimensions: this.requestDimensions }
        : {}),
    });

    return response.data
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding);
  }
}
