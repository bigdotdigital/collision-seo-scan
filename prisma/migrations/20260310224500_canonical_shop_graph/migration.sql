-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "shopId" TEXT;

-- AlterTable
ALTER TABLE "Scan" ADD COLUMN     "shopId" TEXT;

-- AlterTable
ALTER TABLE "TrackedCompetitor" ADD COLUMN     "shopId" TEXT;

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "googlePlaceId" TEXT,
    "primaryCategory" TEXT,
    "verticalDefault" TEXT NOT NULL DEFAULT 'collision',

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopKeywordObservation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "shopId" TEXT NOT NULL,
    "scanId" TEXT,
    "keyword" TEXT NOT NULL,
    "city" TEXT,
    "source" TEXT NOT NULL,
    "searchType" TEXT NOT NULL DEFAULT 'organic',
    "rankPosition" INTEGER,
    "searchVolume" INTEGER,
    "cpcMicros" INTEGER,
    "confidence" TEXT NOT NULL DEFAULT 'modeled',
    "notes" TEXT,

    CONSTRAINT "ShopKeywordObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopCompetitorObservation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "sourceShopId" TEXT NOT NULL,
    "competitorShopId" TEXT NOT NULL,
    "scanId" TEXT,
    "source" TEXT NOT NULL,
    "confidence" TEXT NOT NULL DEFAULT 'modeled',
    "relationshipType" TEXT NOT NULL DEFAULT 'market_competitor',
    "notes" TEXT,

    CONSTRAINT "ShopCompetitorObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_googlePlaceId_key" ON "Shop"("googlePlaceId");

-- CreateIndex
CREATE INDEX "Shop_name_idx" ON "Shop"("name");

-- CreateIndex
CREATE INDEX "Shop_city_state_idx" ON "Shop"("city", "state");

-- CreateIndex
CREATE INDEX "Shop_websiteUrl_idx" ON "Shop"("websiteUrl");

-- CreateIndex
CREATE INDEX "ShopKeywordObservation_shopId_observedAt_idx" ON "ShopKeywordObservation"("shopId", "observedAt");

-- CreateIndex
CREATE INDEX "ShopKeywordObservation_keyword_city_observedAt_idx" ON "ShopKeywordObservation"("keyword", "city", "observedAt");

-- CreateIndex
CREATE INDEX "ShopCompetitorObservation_sourceShopId_observedAt_idx" ON "ShopCompetitorObservation"("sourceShopId", "observedAt");

-- CreateIndex
CREATE INDEX "ShopCompetitorObservation_competitorShopId_observedAt_idx" ON "ShopCompetitorObservation"("competitorShopId", "observedAt");

-- CreateIndex
CREATE INDEX "ShopCompetitorObservation_sourceShopId_competitorShopId_obs_idx" ON "ShopCompetitorObservation"("sourceShopId", "competitorShopId", "observedAt");

-- CreateIndex
CREATE INDEX "Organization_shopId_idx" ON "Organization"("shopId");

-- CreateIndex
CREATE INDEX "Scan_shopId_idx" ON "Scan"("shopId");

-- CreateIndex
CREATE INDEX "TrackedCompetitor_shopId_idx" ON "TrackedCompetitor"("shopId");

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopKeywordObservation" ADD CONSTRAINT "ShopKeywordObservation_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopKeywordObservation" ADD CONSTRAINT "ShopKeywordObservation_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopCompetitorObservation" ADD CONSTRAINT "ShopCompetitorObservation_sourceShopId_fkey" FOREIGN KEY ("sourceShopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopCompetitorObservation" ADD CONSTRAINT "ShopCompetitorObservation_competitorShopId_fkey" FOREIGN KEY ("competitorShopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopCompetitorObservation" ADD CONSTRAINT "ShopCompetitorObservation_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackedCompetitor" ADD CONSTRAINT "TrackedCompetitor_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
