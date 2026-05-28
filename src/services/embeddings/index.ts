import { env } from "../../config/env.js";
import type { EmbeddingProvider } from "./embedding-provider.js";
import { LocalEmbeddingProvider } from "./local-embedding-provider.js";
import { OpenAIEmbeddingProvider } from "./openai-embedding-provider.js";

export type { EmbeddingProvider } from "./embedding-provider.js";

export function createEmbeddingProvider(): EmbeddingProvider {
  if (env.embeddingProvider === "openai") {
    if (!env.openaiApiKey) {
      throw new Error("OPENAI_API_KEY is required when EMBEDDING_PROVIDER=openai");
    }
    return new OpenAIEmbeddingProvider(
      env.openaiApiKey,
      env.openaiEmbeddingModel,
      env.openaiEmbeddingDimensions,
    );
  }

  return new LocalEmbeddingProvider();
}
