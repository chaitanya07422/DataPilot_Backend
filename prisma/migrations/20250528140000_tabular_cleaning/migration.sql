-- CreateEnum (skip if already created by prior migration)
DO $$ BEGIN
  CREATE TYPE "ProcessingStatus" AS ENUM ('pending', 'processing', 'indexed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable uploaded_files
ALTER TABLE "uploaded_files" ADD COLUMN IF NOT EXISTS "processing_status" "ProcessingStatus" NOT NULL DEFAULT 'pending';
ALTER TABLE "uploaded_files" ADD COLUMN IF NOT EXISTS "error_message" TEXT;
ALTER TABLE "uploaded_files" ADD COLUMN IF NOT EXISTS "chunk_count" INTEGER;
ALTER TABLE "uploaded_files" ADD COLUMN IF NOT EXISTS "row_count" INTEGER;
ALTER TABLE "uploaded_files" ADD COLUMN IF NOT EXISTS "cleaned_row_count" INTEGER;
ALTER TABLE "uploaded_files" ADD COLUMN IF NOT EXISTS "sheet_name" TEXT;

CREATE INDEX IF NOT EXISTS "uploaded_files_processing_status_idx" ON "uploaded_files"("processing_status");

-- CreateTable file_sheets
CREATE TABLE "file_sheets" (
    "id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "sheet_name" TEXT,
    "headers" JSONB NOT NULL,
    "cleaning_config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable file_rows
CREATE TABLE "file_rows" (
    "id" UUID NOT NULL,
    "sheet_id" UUID NOT NULL,
    "row_index" INTEGER NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "file_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable cleaning_reports
CREATE TABLE "cleaning_reports" (
    "id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "sheet_id" UUID,
    "original_row_count" INTEGER NOT NULL,
    "cleaned_row_count" INTEGER NOT NULL,
    "duplicates_removed" INTEGER NOT NULL,
    "empty_rows_removed" INTEGER NOT NULL,
    "cells_trimmed" INTEGER NOT NULL DEFAULT 0,
    "cleaning_config" JSONB NOT NULL,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cleaning_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "file_sheets_file_id_idx" ON "file_sheets"("file_id");
CREATE INDEX "file_rows_sheet_id_row_index_idx" ON "file_rows"("sheet_id", "row_index");
CREATE INDEX "cleaning_reports_file_id_idx" ON "cleaning_reports"("file_id");

ALTER TABLE "file_sheets" ADD CONSTRAINT "file_sheets_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "uploaded_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "file_rows" ADD CONSTRAINT "file_rows_sheet_id_fkey" FOREIGN KEY ("sheet_id") REFERENCES "file_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cleaning_reports" ADD CONSTRAINT "cleaning_reports_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "uploaded_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
