-- AlterTable
ALTER TABLE "Document" ADD COLUMN "fileSize" INTEGER;
ALTER TABLE "Document" ADD COLUMN "mimeType" TEXT;
ALTER TABLE "Document" ADD COLUMN "originalFileName" TEXT;
ALTER TABLE "Document" ADD COLUMN "parseSummary" TEXT;
ALTER TABLE "Document" ADD COLUMN "parsedContent" TEXT;
