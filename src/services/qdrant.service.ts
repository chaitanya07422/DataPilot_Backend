import { createHash } from "node:crypto";
import { QdrantClient } from "@qdrant/js-client-rest";
import { env } from "../config/env.js";

export type ChunkPayload = {
  datasetId: string;
  fileId: string;
  chunkIndex: number;
  text: string;
  filename: string;
};

export class QdrantService {
  private readonly client: QdrantClient;
  private readonly collectionName: string;

  constructor(collectionName = env.qdrantCollection) {
    this.client = new QdrantClient({ url: env.qdrantUrl });
    this.collectionName = collectionName;
  }

  async healthCheck(): Promise<{ status: string; url: string }> {
    await this.client.getCollections();
    return { status: "ok", url: env.qdrantUrl };
  }

  async ensureCollection(vectorSize: number): Promise<void> {
    const collections = await this.client.getCollections();
    const exists = collections.collections.some((c) => c.name === this.collectionName);

    if (exists) {
      return;
    }

    await this.client.createCollection(this.collectionName, {
      vectors: {
        size: vectorSize,
        distance: "Cosine",
      },
    });
  }

  async upsertChunks(
    fileId: string,
    datasetId: string,
    filename: string,
    chunks: { index: number; text: string }[],
    vectors: number[][],
  ): Promise<void> {
    if (chunks.length !== vectors.length) {
      throw new Error("Chunk count must match vector count");
    }

    await this.ensureCollection(vectors[0]?.length ?? 384);

    const points = chunks.map((chunk, i) => ({
      id: pointId(fileId, chunk.index),
      vector: vectors[i]!,
      payload: {
        datasetId,
        fileId,
        chunkIndex: chunk.index,
        text: chunk.text.slice(0, 2000),
        filename,
      } satisfies ChunkPayload,
    }));

    await this.client.upsert(this.collectionName, { points });
  }

  async deleteByFileId(fileId: string): Promise<void> {
    const collections = await this.client.getCollections();
    const exists = collections.collections.some((c) => c.name === this.collectionName);
    if (!exists) {
      return;
    }

    await this.client.delete(this.collectionName, {
      filter: {
        must: [{ key: "fileId", match: { value: fileId } }],
      },
    });
  }
}

function pointId(fileId: string, chunkIndex: number): string {
  const hash = createHash("sha256").update(`${fileId}:${chunkIndex}`).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join("-");
}
