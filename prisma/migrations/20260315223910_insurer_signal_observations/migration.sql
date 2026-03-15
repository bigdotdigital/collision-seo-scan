-- CreateTable
CREATE TABLE "ShopInsuranceRelationshipObservation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "shopId" TEXT NOT NULL,
    "scanId" TEXT,
    "insurerName" TEXT NOT NULL,
    "relationshipType" TEXT,
    "signalType" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sourceUrl" TEXT,
    "sourceText" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopInsuranceRelationshipObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopInsuranceRelationshipObservation_shopId_idx" ON "ShopInsuranceRelationshipObservation"("shopId");

-- CreateIndex
CREATE INDEX "ShopInsuranceRelationshipObservation_insurerName_idx" ON "ShopInsuranceRelationshipObservation"("insurerName");

-- CreateIndex
CREATE INDEX "ShopInsuranceRelationshipObservation_observedAt_idx" ON "ShopInsuranceRelationshipObservation"("observedAt");

-- CreateIndex
CREATE INDEX "ShopInsuranceRelationshipObservation_shopId_insurerName_idx" ON "ShopInsuranceRelationshipObservation"("shopId", "insurerName");

-- CreateIndex
CREATE INDEX "ShopInsuranceRelationshipObservation_scanId_idx" ON "ShopInsuranceRelationshipObservation"("scanId");

-- AddForeignKey
ALTER TABLE "ShopInsuranceRelationshipObservation" ADD CONSTRAINT "ShopInsuranceRelationshipObservation_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopInsuranceRelationshipObservation" ADD CONSTRAINT "ShopInsuranceRelationshipObservation_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
