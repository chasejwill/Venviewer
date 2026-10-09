-- Additive only. Existing tours are set to embedPolicy 'any' so they keep
-- framing exactly as they do today. New inserts use the column default
-- 'venview_only'. No tables are dropped or rewritten.

ALTER TABLE "Tour" ADD COLUMN "embedPolicy" TEXT NOT NULL DEFAULT 'venview_only';
UPDATE "Tour" SET "embedPolicy" = 'any';

ALTER TABLE "Tour" ADD COLUMN "embedAllowedDomains" TEXT;
ALTER TABLE "Tour" ADD COLUMN "integrationEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Tour" ADD COLUMN "branding" TEXT;
ALTER TABLE "Tour" ADD COLUMN "primaryCtaLabel" TEXT;
ALTER TABLE "Tour" ADD COLUMN "primaryCtaUrl" TEXT;
ALTER TABLE "Tour" ADD COLUMN "secondaryCtaLabel" TEXT;
ALTER TABLE "Tour" ADD COLUMN "secondaryCtaUrl" TEXT;
ALTER TABLE "Tour" ADD COLUMN "showPoweredByVenview" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'panorama',
    "originalFilename" TEXT,
    "storageProvider" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "checksum" TEXT,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "processingStatus" TEXT NOT NULL DEFAULT 'pending',
    "lifecycleStatus" TEXT NOT NULL DEFAULT 'active',
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "processingError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetVariant" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "checksum" TEXT,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetVariant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TourAnalytics" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "uniqueViews" INTEGER NOT NULL DEFAULT 0,
    "embedViews" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourAnalytics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TourEvent" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "surface" TEXT,
    "metadata" TEXT,
    "referrerDomain" TEXT,
    "visitorKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TourEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Asset_tourId_idx" ON "Asset"("tourId");
CREATE INDEX "Asset_processingStatus_idx" ON "Asset"("processingStatus");
CREATE INDEX "Asset_lifecycleStatus_idx" ON "Asset"("lifecycleStatus");
CREATE UNIQUE INDEX "AssetVariant_assetId_variant_key" ON "AssetVariant"("assetId", "variant");
CREATE UNIQUE INDEX "TourAnalytics_tourId_key" ON "TourAnalytics"("tourId");
CREATE INDEX "TourEvent_tourId_type_idx" ON "TourEvent"("tourId", "type");
CREATE INDEX "TourEvent_createdAt_idx" ON "TourEvent"("createdAt");

ALTER TABLE "Asset" ADD CONSTRAINT "Asset_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetVariant" ADD CONSTRAINT "AssetVariant_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TourAnalytics" ADD CONSTRAINT "TourAnalytics_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TourEvent" ADD CONSTRAINT "TourEvent_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;
