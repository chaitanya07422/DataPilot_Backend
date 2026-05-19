import { env } from "../config/env.js";

/**
 * Qdrant vector store client placeholder.
 * Wire actual @qdrant/js-client-rest integration when implementing AI features.
 */
export class QdrantService {
  private readonly baseUrl = env.qdrantUrl;

  async healthCheck(): Promise<{ status: string; url: string }> {
    return {
      status: "placeholder",
      url: this.baseUrl,
    };
  }
}
