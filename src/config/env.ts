import "dotenv/config";

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? "0.0.0.0",
  logLevel: process.env.LOG_LEVEL ?? "info",
  databaseUrl: required("DATABASE_URL"),
  redis: {
    host: process.env.REDIS_HOST ?? "localhost",
    port: Number(process.env.REDIS_PORT ?? 6379),
  },
  qdrantUrl: process.env.QDRANT_URL ?? "http://localhost:6333",
  qdrantCollection: process.env.QDRANT_COLLECTION ?? "datapilot_documents",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  uploadDir: process.env.UPLOAD_DIR ?? "./uploads",
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 20_971_520),
  embeddingProvider: (process.env.EMBEDDING_PROVIDER ?? "local") as "local" | "openai",
  localEmbeddingModel:
    process.env.LOCAL_EMBEDDING_MODEL ?? "Xenova/all-MiniLM-L6-v2",
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiEmbeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
  openaiEmbeddingDimensions: process.env.OPENAI_EMBEDDING_DIMENSIONS
    ? Number(process.env.OPENAI_EMBEDDING_DIMENSIONS)
    : undefined,
  devUserId: process.env.DEV_USER_ID ?? "00000000-0000-4000-8000-000000000001",
  bullBoardEnabled: process.env.BULL_BOARD_ENABLED !== "false",
  bullBoardPath: process.env.BULL_BOARD_PATH ?? "/admin/queues",
} as const;
