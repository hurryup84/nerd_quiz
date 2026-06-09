-- Add playCount and normalizedPlayCount columns to Question table for fair question selection
ALTER TABLE "Question" ADD COLUMN "normalizedPlayCount" INTEGER NOT NULL DEFAULT 0;

-- Create indexes for efficient querying
CREATE INDEX "Question_normalizedPlayCount_idx" ON "Question"("normalizedPlayCount");