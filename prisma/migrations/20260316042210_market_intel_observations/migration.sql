-- CreateTable
CREATE TABLE "MarketIntelObservation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "marketId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "metricValue" DOUBLE PRECISION NOT NULL,
    "metricUnit" TEXT,
    "dimensionKey" TEXT NOT NULL DEFAULT '',
    "dimensionValue" TEXT NOT NULL DEFAULT '',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sourceUrl" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "MarketIntelObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketIntelObservation_marketId_observedAt_idx" ON "MarketIntelObservation"("marketId", "observedAt");

-- CreateIndex
CREATE INDEX "MarketIntelObservation_sourceType_observedAt_idx" ON "MarketIntelObservation"("sourceType", "observedAt");

-- CreateIndex
CREATE INDEX "MarketIntelObservation_marketId_signalType_observedAt_idx" ON "MarketIntelObservation"("marketId", "signalType", "observedAt");

-- CreateIndex
CREATE INDEX "MarketIntelObservation_dimensionKey_dimensionValue_observed_idx" ON "MarketIntelObservation"("dimensionKey", "dimensionValue", "observedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketIntelObservation_marketId_sourceType_signalType_metri_key" ON "MarketIntelObservation"("marketId", "sourceType", "signalType", "metricKey", "dimensionKey", "dimensionValue", "observedAt");

-- AddForeignKey
ALTER TABLE "MarketIntelObservation" ADD CONSTRAINT "MarketIntelObservation_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;
