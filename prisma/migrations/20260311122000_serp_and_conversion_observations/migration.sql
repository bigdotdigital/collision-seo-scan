-- CreateTable
CREATE TABLE "ShopSerpObservation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "shopId" TEXT NOT NULL,
    "marketId" TEXT,
    "scanId" TEXT,
    "query" TEXT NOT NULL,
    "searchSurface" TEXT NOT NULL DEFAULT 'map_pack',
    "source" TEXT NOT NULL,
    "confidence" TEXT NOT NULL DEFAULT 'modeled',
    "yourRankLabel" TEXT,
    "yourRankPosition" INTEGER,
    "topResultsJson" TEXT NOT NULL,
    "rawJson" TEXT,

    CONSTRAINT "ShopSerpObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopConversionObservation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "shopId" TEXT NOT NULL,
    "marketId" TEXT,
    "organizationId" TEXT,
    "scanId" TEXT,
    "leadId" TEXT,
    "eventType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "confidence" TEXT NOT NULL DEFAULT 'live',
    "valueJson" TEXT,

    CONSTRAINT "ShopConversionObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopSerpObservation_shopId_observedAt_idx" ON "ShopSerpObservation"("shopId", "observedAt");

-- CreateIndex
CREATE INDEX "ShopSerpObservation_marketId_observedAt_idx" ON "ShopSerpObservation"("marketId", "observedAt");

-- CreateIndex
CREATE INDEX "ShopSerpObservation_query_observedAt_idx" ON "ShopSerpObservation"("query", "observedAt");

-- CreateIndex
CREATE INDEX "ShopConversionObservation_shopId_observedAt_idx" ON "ShopConversionObservation"("shopId", "observedAt");

-- CreateIndex
CREATE INDEX "ShopConversionObservation_marketId_observedAt_idx" ON "ShopConversionObservation"("marketId", "observedAt");

-- CreateIndex
CREATE INDEX "ShopConversionObservation_eventType_observedAt_idx" ON "ShopConversionObservation"("eventType", "observedAt");

-- CreateIndex
CREATE INDEX "ShopConversionObservation_organizationId_observedAt_idx" ON "ShopConversionObservation"("organizationId", "observedAt");

-- CreateIndex
CREATE INDEX "ShopConversionObservation_scanId_observedAt_idx" ON "ShopConversionObservation"("scanId", "observedAt");

-- AddForeignKey
ALTER TABLE "ShopSerpObservation" ADD CONSTRAINT "ShopSerpObservation_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopSerpObservation" ADD CONSTRAINT "ShopSerpObservation_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopSerpObservation" ADD CONSTRAINT "ShopSerpObservation_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopConversionObservation" ADD CONSTRAINT "ShopConversionObservation_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopConversionObservation" ADD CONSTRAINT "ShopConversionObservation_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopConversionObservation" ADD CONSTRAINT "ShopConversionObservation_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopConversionObservation" ADD CONSTRAINT "ShopConversionObservation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
