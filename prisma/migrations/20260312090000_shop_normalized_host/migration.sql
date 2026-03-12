-- AlterTable
ALTER TABLE "Shop" ADD COLUMN "normalizedWebsiteHost" TEXT;

-- Backfill normalized host values from existing website URLs.
UPDATE "Shop"
SET "normalizedWebsiteHost" = lower(regexp_replace(regexp_replace("websiteUrl", '^https?://', ''), '^www\.', ''))
WHERE "websiteUrl" IS NOT NULL
  AND "normalizedWebsiteHost" IS NULL;

-- Trim everything after the first slash if present.
UPDATE "Shop"
SET "normalizedWebsiteHost" = split_part("normalizedWebsiteHost", '/', 1)
WHERE "normalizedWebsiteHost" IS NOT NULL;

-- CreateIndex
CREATE INDEX "Shop_normalizedWebsiteHost_idx" ON "Shop"("normalizedWebsiteHost");
