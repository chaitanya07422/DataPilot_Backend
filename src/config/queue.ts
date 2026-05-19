import { env } from "./env.js";

export const QUEUE_NAMES = {
  DATA_PROCESSING: "data-processing",
} as const;

export const redisConnection = {
  host: env.redis.host,
  port: env.redis.port,
};
