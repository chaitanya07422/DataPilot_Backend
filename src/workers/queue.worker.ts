import { Worker } from "bullmq";
import { logger } from "../config/logger.js";
import { QUEUE_NAMES, redisConnection } from "../config/queue.js";
import { processDataProcessingJob } from "./processors/data-processing.processor.js";

export function createQueueWorker() {
  const worker = new Worker(QUEUE_NAMES.DATA_PROCESSING, processDataProcessingJob, {
    connection: redisConnection,
  });

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, name: job.name }, "Job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Job failed");
  });

  return worker;
}
