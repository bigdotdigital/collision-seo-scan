-- AlterTable
ALTER TABLE "Scan"
ADD COLUMN "publicPublishedAt" TIMESTAMP(3),
ADD COLUMN "publicStatus" TEXT NOT NULL DEFAULT 'private',
ADD COLUMN "publicSummaryJson" TEXT;

-- AlterTable
ALTER TABLE "Shop"
ADD COLUMN "publicProfileOptOutAt" TIMESTAMP(3),
ADD COLUMN "publicProfileSlug" TEXT;

-- CreateIndex
CREATE INDEX "Scan_shopId_publicStatus_createdAt_idx" ON "Scan"("shopId", "publicStatus", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_publicProfileSlug_key" ON "Shop"("publicProfileSlug");
