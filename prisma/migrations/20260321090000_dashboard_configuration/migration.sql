-- CreateTable
CREATE TABLE "DashboardConfiguration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "preferredProfileId" TEXT,
    "primaryModuleIds" JSONB,
    "focusTags" JSONB,
    "customSummary" TEXT,
    "operatorNote" TEXT,
    "ownerWeeklyGoal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DashboardConfiguration_organizationId_key" ON "DashboardConfiguration"("organizationId");

-- CreateIndex
CREATE INDEX "DashboardConfiguration_preferredProfileId_idx" ON "DashboardConfiguration"("preferredProfileId");

-- AddForeignKey
ALTER TABLE "DashboardConfiguration" ADD CONSTRAINT "DashboardConfiguration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
