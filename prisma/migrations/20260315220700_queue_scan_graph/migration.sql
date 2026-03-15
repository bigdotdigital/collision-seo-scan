-- AlterTable
ALTER TABLE "QueueJob" ADD COLUMN     "errorType" TEXT,
ADD COLUMN     "finishedAt" TIMESTAMP(3),
ADD COLUMN     "maxAttempts" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "traceId" TEXT;

-- AlterTable
ALTER TABLE "Scan" ADD COLUMN     "durationMs" INTEGER,
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "errorType" TEXT,
ADD COLUMN     "executionAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "executionStatus" TEXT NOT NULL DEFAULT 'completed',
ADD COLUMN     "finishedAt" TIMESTAMP(3),
ADD COLUMN     "queuedAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "traceId" TEXT;

-- CreateTable
CREATE TABLE "ShopGraphEdge" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "edgeKey" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "observedDay" TIMESTAMP(3) NOT NULL,
    "sourceShopId" TEXT NOT NULL,
    "targetShopId" TEXT NOT NULL,
    "scanId" TEXT,
    "edgeType" TEXT NOT NULL,
    "strength" DOUBLE PRECISION,
    "metadataJson" TEXT,

    CONSTRAINT "ShopGraphEdge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopGraphEdge_edgeKey_key" ON "ShopGraphEdge"("edgeKey");

-- CreateIndex
CREATE INDEX "ShopGraphEdge_sourceShopId_observedAt_idx" ON "ShopGraphEdge"("sourceShopId", "observedAt");

-- CreateIndex
CREATE INDEX "ShopGraphEdge_targetShopId_observedAt_idx" ON "ShopGraphEdge"("targetShopId", "observedAt");

-- CreateIndex
CREATE INDEX "QueueJob_type_status_runAt_idx" ON "QueueJob"("type", "status", "runAt");

-- CreateIndex
CREATE INDEX "Scan_executionStatus_createdAt_idx" ON "Scan"("executionStatus", "createdAt");

-- AddForeignKey
ALTER TABLE "ShopGraphEdge" ADD CONSTRAINT "ShopGraphEdge_sourceShopId_fkey" FOREIGN KEY ("sourceShopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopGraphEdge" ADD CONSTRAINT "ShopGraphEdge_targetShopId_fkey" FOREIGN KEY ("targetShopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopGraphEdge" ADD CONSTRAINT "ShopGraphEdge_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
