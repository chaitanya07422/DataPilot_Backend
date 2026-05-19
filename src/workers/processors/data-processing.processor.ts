import type { Job } from "bullmq";
import { logger } from "../../config/logger.js";

export type DataProcessingJobData = {
  datasetId?: string;
  fileId?: string;
};

export type DataProcessingJobResult = {
  status: "placeholder";
};

/**
 * Placeholder processor for dataset/file jobs.
 * Implement parsing, transforms, and persistence here.
 */
export async function processDataProcessingJob(
  job: Job<DataProcessingJobData>,
): Promise<DataProcessingJobResult> {
  logger.info(
    { jobId: job.id, name: job.name, data: job.data },
    "Processing job (placeholder)",
  );

  return { status: "placeholder" };
}
