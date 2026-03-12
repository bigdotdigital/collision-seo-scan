-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "vertical" TEXT NOT NULL DEFAULT 'collision',
    "country" TEXT NOT NULL DEFAULT 'US',
    "city" TEXT NOT NULL,
    "state" TEXT,
    "regionKey" TEXT NOT NULL,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN "marketId" TEXT;

-- CreateTable
CREATE TABLE "ShopSiteFeatureObservation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "shopId" TEXT NOT NULL,
    "marketId" TEXT,
    "scanId" TEXT,
    "source" TEXT NOT NULL,
    "confidence" TEXT NOT NULL DEFAULT 'modeled',
    "checkedUrlCount" INTEGER,
    "servicePageCount" INTEGER,
    "oemSignalCount" INTEGER NOT NULL DEFAULT 0,
    "hasEstimateCta" BOOLEAN NOT NULL DEFAULT false,
    "hasOnlineEstimateFlow" BOOLEAN NOT NULL DEFAULT false,
    "hasReviewProof" BOOLEAN NOT NULL DEFAULT false,
    "hasReviewSchema" BOOLEAN NOT NULL DEFAULT false,
    "hasMapEmbed" BOOLEAN NOT NULL DEFAULT false,
    "hasDirectionsCta" BOOLEAN NOT NULL DEFAULT false,
    "hasLocationFinder" BOOLEAN NOT NULL DEFAULT false,
    "hasInsuranceGuidance" BOOLEAN NOT NULL DEFAULT false,
    "hasWarranty" BOOLEAN NOT NULL DEFAULT false,
    "hasAdasContent" BOOLEAN NOT NULL DEFAULT false,
    "hasCertificationPage" BOOLEAN NOT NULL DEFAULT false,
    "schemaTypesJson" TEXT,
    "missingPagesJson" TEXT,
    "rawChecksJson" TEXT,

    CONSTRAINT "ShopSiteFeatureObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BenchmarkSnapshot" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "marketId" TEXT NOT NULL,
    "snapshotType" TEXT NOT NULL DEFAULT 'city_market',
    "source" TEXT NOT NULL DEFAULT 'aggregated',
    "vertical" TEXT NOT NULL DEFAULT 'collision',
    "shopCount" INTEGER NOT NULL,
    "scanCount" INTEGER NOT NULL,
    "avgOverallScore" DOUBLE PRECISION,
    "avgWebsiteScore" DOUBLE PRECISION,
    "avgLocalScore" DOUBLE PRECISION,
    "avgIntentScore" DOUBLE PRECISION,
    "avgReviewCount" DOUBLE PRECISION,
    "avgReviewRating" DOUBLE PRECISION,
    "featureRatesJson" TEXT NOT NULL,
    "keywordHighlightsJson" TEXT,
    "competitorStatsJson" TEXT,

    CONSTRAINT "BenchmarkSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Market_regionKey_key" ON "Market"("regionKey");

-- CreateIndex
CREATE INDEX "Market_vertical_state_city_idx" ON "Market"("vertical", "state", "city");

-- CreateIndex
CREATE INDEX "Shop_marketId_idx" ON "Shop"("marketId");

-- CreateIndex
CREATE INDEX "ShopSiteFeatureObservation_shopId_observedAt_idx" ON "ShopSiteFeatureObservation"("shopId", "observedAt");

-- CreateIndex
CREATE INDEX "ShopSiteFeatureObservation_marketId_observedAt_idx" ON "ShopSiteFeatureObservation"("marketId", "observedAt");

-- CreateIndex
CREATE INDEX "ShopSiteFeatureObservation_source_observedAt_idx" ON "ShopSiteFeatureObservation"("source", "observedAt");

-- CreateIndex
CREATE INDEX "BenchmarkSnapshot_marketId_observedAt_idx" ON "BenchmarkSnapshot"("marketId", "observedAt");

-- CreateIndex
CREATE INDEX "BenchmarkSnapshot_snapshotType_observedAt_idx" ON "BenchmarkSnapshot"("snapshotType", "observedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BenchmarkSnapshot_marketId_snapshotType_observedAt_key" ON "BenchmarkSnapshot"("marketId", "snapshotType", "observedAt");

-- Backfill canonical markets for existing shops with location data.
INSERT INTO "Market" ("id", "createdAt", "updatedAt", "vertical", "country", "city", "state", "regionKey")
SELECT
  'market_' || md5(lower(COALESCE(s."verticalDefault", 'collision')) || ':US:' || lower(COALESCE(s."state", 'unknown-state')) || ':' || lower(s."city")),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  COALESCE(s."verticalDefault", 'collision'),
  'US',
  s."city",
  s."state",
  lower(COALESCE(s."verticalDefault", 'collision')) || ':US:' || lower(COALESCE(s."state", 'unknown-state')) || ':' || lower(s."city")
FROM "Shop" s
WHERE s."city" IS NOT NULL
GROUP BY s."city", s."state", s."verticalDefault"
ON CONFLICT ("regionKey") DO NOTHING;

UPDATE "Shop" s
SET "marketId" = m."id"
FROM "Market" m
WHERE s."city" IS NOT NULL
  AND m."regionKey" = lower(COALESCE(s."verticalDefault", 'collision')) || ':US:' || lower(COALESCE(s."state", 'unknown-state')) || ':' || lower(s."city")
  AND s."marketId" IS NULL;

-- AddForeignKey
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopSiteFeatureObservation" ADD CONSTRAINT "ShopSiteFeatureObservation_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopSiteFeatureObservation" ADD CONSTRAINT "ShopSiteFeatureObservation_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopSiteFeatureObservation" ADD CONSTRAINT "ShopSiteFeatureObservation_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenchmarkSnapshot" ADD CONSTRAINT "BenchmarkSnapshot_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;
