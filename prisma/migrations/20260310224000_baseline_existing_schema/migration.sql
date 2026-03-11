-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('owner', 'manager', 'viewer', 'agency_admin');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('rank_drop', 'rank_gain', 'competitor_moved_above', 'new_competitor', 'gbp_issue');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('info', 'warning', 'critical');

-- CreateEnum
CREATE TYPE "DigestFrequency" AS ENUM ('off', 'daily', 'weekly');

-- CreateTable
CREATE TABLE "Scan" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shopName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "scoreTotal" INTEGER NOT NULL,
    "scoreWebsite" INTEGER NOT NULL,
    "scoreLocal" INTEGER NOT NULL,
    "scoreIntent" INTEGER NOT NULL,
    "issuesJson" TEXT NOT NULL,
    "moneyKeywordsJson" TEXT NOT NULL,
    "competitorsJson" TEXT NOT NULL,
    "rawChecksJson" TEXT NOT NULL,
    "aiSummary" TEXT,
    "thirtyDayPlanJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'lead',
    "organizationId" TEXT,
    "scoringModelVersion" TEXT NOT NULL DEFAULT 'v0.1',
    "componentScoresJson" TEXT,
    "latestSnapshotId" TEXT,
    "clientId" TEXT,
    "bookedClicked" BOOLEAN NOT NULL DEFAULT false,
    "followupSent" BOOLEAN NOT NULL DEFAULT false,
    "pagespeedJson" TEXT,
    "vertical" TEXT NOT NULL DEFAULT 'collision',

    CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shopName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "ownerPhone" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'leadgen',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "stripeCustomerId" TEXT,
    "primaryScanId" TEXT,
    "portalPasswordHash" TEXT,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricSnapshot" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT NOT NULL,
    "keywordsJson" TEXT NOT NULL,
    "gscJson" TEXT,
    "gbpJson" TEXT,
    "reviewsJson" TEXT,
    "summaryJson" TEXT NOT NULL,
    "scoreTotal" INTEGER,

    CONSTRAINT "MetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Keyword" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "intentType" TEXT NOT NULL,
    "targetUrl" TEXT,

    CONSTRAINT "Keyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueJob" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "runAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "scanId" TEXT,
    "clientId" TEXT,
    "payloadJson" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "QueueJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "verticalDefault" TEXT NOT NULL DEFAULT 'collision',
    "agencyManaged" BOOLEAN NOT NULL DEFAULT false,
    "planTier" TEXT NOT NULL DEFAULT 'monitor',
    "slug" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanSnapshot" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scanId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "scoringModelVersion" TEXT NOT NULL DEFAULT 'v0.1',
    "visibilityScore" INTEGER NOT NULL,
    "reviewRating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "reviewVelocity30d" INTEGER,
    "keywordsCheckedJson" TEXT,
    "rankPositionsJson" TEXT,
    "topCompetitorsJson" TEXT,
    "lostDemandEstimateJson" TEXT,
    "recommendationsJson" TEXT,
    "vertical" TEXT NOT NULL DEFAULT 'collision',

    CONSTRAINT "ScanSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawProviderResponse" (
    "id" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scanId" TEXT NOT NULL,
    "organizationId" TEXT,
    "provider" TEXT NOT NULL,
    "endpoint" TEXT,
    "requestHash" TEXT,
    "cacheKey" TEXT,
    "responseJson" TEXT NOT NULL,

    CONSTRAINT "RawProviderResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderCache" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "lastFetchedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "scanId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT,
    "intent" TEXT,
    "budgetRange" TEXT,
    "timeline" TEXT,
    "consentedAt" TIMESTAMP(3),
    "source" TEXT,
    "vertical" TEXT,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgMembership" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'owner',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "gbpUrl" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "serviceArea" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackedKeyword" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'scanner',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackedKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackedCompetitor" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "gbpPlaceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'scanner',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackedCompetitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeywordRankSnapshot" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "keywordId" TEXT NOT NULL,
    "competitorId" TEXT,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "rankPosition" INTEGER,
    "delta" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'stub',
    "rawJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeywordRankSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "locationId" TEXT,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'info',
    "payloadJson" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "digestSentAt" TIMESTAMP(3),

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertPreference" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "rankDropThreshold" INTEGER NOT NULL DEFAULT 3,
    "rankGainThreshold" INTEGER NOT NULL DEFAULT 3,
    "competitorMoveEnabled" BOOLEAN NOT NULL DEFAULT true,
    "newCompetitorEnabled" BOOLEAN NOT NULL DEFAULT true,
    "gbpIssueEnabled" BOOLEAN NOT NULL DEFAULT true,
    "digestFrequency" "DigestFrequency" NOT NULL DEFAULT 'daily',
    "digestEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "planTier" TEXT NOT NULL DEFAULT 'monitor',
    "status" TEXT NOT NULL DEFAULT 'trialing',
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "stripeInvoiceId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "hostedInvoiceUrl" TEXT,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Scan_organizationId_idx" ON "Scan"("organizationId");

-- CreateIndex
CREATE INDEX "Scan_vertical_idx" ON "Scan"("vertical");

-- CreateIndex
CREATE INDEX "Scan_createdAt_idx" ON "Scan"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Client_primaryScanId_key" ON "Client"("primaryScanId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_googlePlaceId_key" ON "Organization"("googlePlaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_city_state_idx" ON "Organization"("city", "state");

-- CreateIndex
CREATE INDEX "Organization_name_idx" ON "Organization"("name");

-- CreateIndex
CREATE INDEX "ScanSnapshot_organizationId_createdAt_idx" ON "ScanSnapshot"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ScanSnapshot_vertical_createdAt_idx" ON "ScanSnapshot"("vertical", "createdAt");

-- CreateIndex
CREATE INDEX "ScanSnapshot_scanId_idx" ON "ScanSnapshot"("scanId");

-- CreateIndex
CREATE INDEX "RawProviderResponse_provider_idx" ON "RawProviderResponse"("provider");

-- CreateIndex
CREATE INDEX "RawProviderResponse_organizationId_idx" ON "RawProviderResponse"("organizationId");

-- CreateIndex
CREATE INDEX "RawProviderResponse_scanId_idx" ON "RawProviderResponse"("scanId");

-- CreateIndex
CREATE INDEX "ProviderCache_expiresAt_idx" ON "ProviderCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderCache_organizationId_provider_cacheKey_key" ON "ProviderCache"("organizationId", "provider", "cacheKey");

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");

-- CreateIndex
CREATE INDEX "Lead_organizationId_createdAt_idx" ON "Lead"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "OrgMembership_userId_role_idx" ON "OrgMembership"("userId", "role");

-- CreateIndex
CREATE INDEX "OrgMembership_orgId_role_idx" ON "OrgMembership"("orgId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "OrgMembership_orgId_userId_key" ON "OrgMembership"("orgId", "userId");

-- CreateIndex
CREATE INDEX "Location_orgId_isPrimary_idx" ON "Location"("orgId", "isPrimary");

-- CreateIndex
CREATE INDEX "Location_orgId_city_state_idx" ON "Location"("orgId", "city", "state");

-- CreateIndex
CREATE INDEX "TrackedKeyword_orgId_isActive_idx" ON "TrackedKeyword"("orgId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TrackedKeyword_locationId_term_key" ON "TrackedKeyword"("locationId", "term");

-- CreateIndex
CREATE INDEX "TrackedCompetitor_orgId_isActive_idx" ON "TrackedCompetitor"("orgId", "isActive");

-- CreateIndex
CREATE INDEX "TrackedCompetitor_locationId_isActive_idx" ON "TrackedCompetitor"("locationId", "isActive");

-- CreateIndex
CREATE INDEX "KeywordRankSnapshot_orgId_snapshotDate_idx" ON "KeywordRankSnapshot"("orgId", "snapshotDate");

-- CreateIndex
CREATE INDEX "KeywordRankSnapshot_locationId_snapshotDate_idx" ON "KeywordRankSnapshot"("locationId", "snapshotDate");

-- CreateIndex
CREATE INDEX "KeywordRankSnapshot_keywordId_snapshotDate_idx" ON "KeywordRankSnapshot"("keywordId", "snapshotDate");

-- CreateIndex
CREATE INDEX "KeywordRankSnapshot_competitorId_snapshotDate_idx" ON "KeywordRankSnapshot"("competitorId", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "KeywordRankSnapshot_keywordId_competitorId_snapshotDate_key" ON "KeywordRankSnapshot"("keywordId", "competitorId", "snapshotDate");

-- CreateIndex
CREATE INDEX "Alert_orgId_createdAt_idx" ON "Alert"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_orgId_isRead_createdAt_idx" ON "Alert"("orgId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_locationId_createdAt_idx" ON "Alert"("locationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AlertPreference_orgId_key" ON "AlertPreference"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_orgId_key" ON "Subscription"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_stripeInvoiceId_key" ON "Invoice"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "Invoice_orgId_invoiceDate_idx" ON "Invoice"("orgId", "invoiceDate");

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_primaryScanId_fkey" FOREIGN KEY ("primaryScanId") REFERENCES "Scan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricSnapshot" ADD CONSTRAINT "MetricSnapshot_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Keyword" ADD CONSTRAINT "Keyword_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueJob" ADD CONSTRAINT "QueueJob_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueJob" ADD CONSTRAINT "QueueJob_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanSnapshot" ADD CONSTRAINT "ScanSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanSnapshot" ADD CONSTRAINT "ScanSnapshot_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawProviderResponse" ADD CONSTRAINT "RawProviderResponse_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawProviderResponse" ADD CONSTRAINT "RawProviderResponse_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCache" ADD CONSTRAINT "ProviderCache_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMembership" ADD CONSTRAINT "OrgMembership_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMembership" ADD CONSTRAINT "OrgMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackedKeyword" ADD CONSTRAINT "TrackedKeyword_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackedKeyword" ADD CONSTRAINT "TrackedKeyword_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackedCompetitor" ADD CONSTRAINT "TrackedCompetitor_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackedCompetitor" ADD CONSTRAINT "TrackedCompetitor_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordRankSnapshot" ADD CONSTRAINT "KeywordRankSnapshot_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "TrackedCompetitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordRankSnapshot" ADD CONSTRAINT "KeywordRankSnapshot_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "TrackedKeyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordRankSnapshot" ADD CONSTRAINT "KeywordRankSnapshot_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordRankSnapshot" ADD CONSTRAINT "KeywordRankSnapshot_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertPreference" ADD CONSTRAINT "AlertPreference_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
