-- CreateTable
CREATE TABLE "ShopReviewObservation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "shopId" TEXT NOT NULL,
    "marketId" TEXT,
    "scanId" TEXT,
    "source" TEXT NOT NULL,
    "confidence" TEXT NOT NULL DEFAULT 'modeled',
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "googlePlaceId" TEXT,
    "googleMapsUri" TEXT,
    "rawJson" TEXT,

    CONSTRAINT "ShopReviewObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopRankObservation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "shopId" TEXT NOT NULL,
    "marketId" TEXT,
    "orgId" TEXT,
    "locationId" TEXT,
    "keyword" TEXT NOT NULL,
    "rankPosition" INTEGER,
    "delta" INTEGER,
    "searchType" TEXT NOT NULL DEFAULT 'organic',
    "source" TEXT NOT NULL,
    "confidence" TEXT NOT NULL DEFAULT 'modeled',
    "rawJson" TEXT,

    CONSTRAINT "ShopRankObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopReviewObservation_shopId_observedAt_idx" ON "ShopReviewObservation"("shopId", "observedAt");

-- CreateIndex
CREATE INDEX "ShopReviewObservation_marketId_observedAt_idx" ON "ShopReviewObservation"("marketId", "observedAt");

-- CreateIndex
CREATE INDEX "ShopReviewObservation_googlePlaceId_idx" ON "ShopReviewObservation"("googlePlaceId");

-- CreateIndex
CREATE INDEX "ShopRankObservation_shopId_observedAt_idx" ON "ShopRankObservation"("shopId", "observedAt");

-- CreateIndex
CREATE INDEX "ShopRankObservation_marketId_observedAt_idx" ON "ShopRankObservation"("marketId", "observedAt");

-- CreateIndex
CREATE INDEX "ShopRankObservation_keyword_observedAt_idx" ON "ShopRankObservation"("keyword", "observedAt");

-- CreateIndex
CREATE INDEX "ShopRankObservation_orgId_locationId_observedAt_idx" ON "ShopRankObservation"("orgId", "locationId", "observedAt");

-- AddForeignKey
ALTER TABLE "ShopReviewObservation" ADD CONSTRAINT "ShopReviewObservation_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopReviewObservation" ADD CONSTRAINT "ShopReviewObservation_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopReviewObservation" ADD CONSTRAINT "ShopReviewObservation_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopRankObservation" ADD CONSTRAINT "ShopRankObservation_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopRankObservation" ADD CONSTRAINT "ShopRankObservation_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE SET NULL ON UPDATE CASCADE;
