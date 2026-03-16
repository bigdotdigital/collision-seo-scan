-- CreateTable
CREATE TABLE "ShopSourceObservation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "shopId" TEXT NOT NULL,
    "marketId" TEXT,
    "scanId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "externalId" TEXT,
    "observedName" TEXT,
    "observedPhone" TEXT,
    "observedAddress" TEXT,
    "city" TEXT,
    "state" TEXT,
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "followerCount" INTEGER,
    "postCount" INTEGER,
    "activityScore" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "observedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopSourceObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopDigitalPresenceSnapshot" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "shopId" TEXT NOT NULL,
    "hasWebsite" BOOLEAN NOT NULL DEFAULT false,
    "hasGoogleProfile" BOOLEAN NOT NULL DEFAULT false,
    "hasYelp" BOOLEAN NOT NULL DEFAULT false,
    "hasFacebook" BOOLEAN NOT NULL DEFAULT false,
    "hasInstagram" BOOLEAN NOT NULL DEFAULT false,
    "hasCarwise" BOOLEAN NOT NULL DEFAULT false,
    "hasNewsMentions" BOOLEAN NOT NULL DEFAULT false,
    "hasRedditMentions" BOOLEAN NOT NULL DEFAULT false,
    "googleReviewCount" INTEGER,
    "yelpReviewCount" INTEGER,
    "instagramActivity" DOUBLE PRECISION,
    "facebookActivity" DOUBLE PRECISION,
    "sourceCoverageScore" DOUBLE PRECISION,
    "hiddenOperatorScore" DOUBLE PRECISION,
    "lastObservedAt" TIMESTAMP(3),

    CONSTRAINT "ShopDigitalPresenceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopSourceObservation_shopId_idx" ON "ShopSourceObservation"("shopId");

-- CreateIndex
CREATE INDEX "ShopSourceObservation_sourceType_idx" ON "ShopSourceObservation"("sourceType");

-- CreateIndex
CREATE INDEX "ShopSourceObservation_observedAt_idx" ON "ShopSourceObservation"("observedAt");

-- CreateIndex
CREATE INDEX "ShopSourceObservation_shopId_sourceType_idx" ON "ShopSourceObservation"("shopId", "sourceType");

-- CreateIndex
CREATE INDEX "ShopSourceObservation_marketId_observedAt_idx" ON "ShopSourceObservation"("marketId", "observedAt");

-- CreateIndex
CREATE INDEX "ShopSourceObservation_scanId_idx" ON "ShopSourceObservation"("scanId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopDigitalPresenceSnapshot_shopId_key" ON "ShopDigitalPresenceSnapshot"("shopId");

-- CreateIndex
CREATE INDEX "ShopDigitalPresenceSnapshot_lastObservedAt_idx" ON "ShopDigitalPresenceSnapshot"("lastObservedAt");

-- CreateIndex
CREATE INDEX "ShopDigitalPresenceSnapshot_sourceCoverageScore_idx" ON "ShopDigitalPresenceSnapshot"("sourceCoverageScore");

-- CreateIndex
CREATE INDEX "ShopDigitalPresenceSnapshot_hiddenOperatorScore_idx" ON "ShopDigitalPresenceSnapshot"("hiddenOperatorScore");

-- AddForeignKey
ALTER TABLE "ShopSourceObservation" ADD CONSTRAINT "ShopSourceObservation_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopSourceObservation" ADD CONSTRAINT "ShopSourceObservation_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopSourceObservation" ADD CONSTRAINT "ShopSourceObservation_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopDigitalPresenceSnapshot" ADD CONSTRAINT "ShopDigitalPresenceSnapshot_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
