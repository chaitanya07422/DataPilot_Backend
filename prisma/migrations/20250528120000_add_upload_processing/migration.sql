-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('pending', 'processing', 'indexed', 'failed');

-- AlterTable
ALTER TABLE "uploaded_files" ADD COLUMN "processing_status" "ProcessingStatus" NOT NULL DEFAULT 'pending';
ALTER TABLE "uploaded_files" ADD COLUMN "error_message" TEXT;
ALTER TABLE "uploaded_files" ADD COLUMN "chunk_count" INTEGER;

-- CreateIndex
CREATE INDEX "uploaded_files_processing_status_idx" ON "uploaded_files"("processing_status");
