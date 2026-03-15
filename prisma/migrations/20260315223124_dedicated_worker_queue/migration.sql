-- AlterTable
ALTER TABLE "QueueJob" ADD COLUMN     "lockOwner" TEXT,
ADD COLUMN     "lockedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "QueueJob_status_lockedAt_idx" ON "QueueJob"("status", "lockedAt");
