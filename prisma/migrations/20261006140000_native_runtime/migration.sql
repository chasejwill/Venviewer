-- Native tours do not store a Kuula URL. Existing rows stay legacy-kuula.
ALTER TABLE "Tour" ALTER COLUMN "kuulaUrl" DROP NOT NULL;

ALTER TABLE "Tour" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'legacy-kuula';

ALTER TABLE "Tour" ADD COLUMN "defaultSceneId" TEXT;

ALTER TABLE "Tour" ADD CONSTRAINT "Tour_provider_check" CHECK (
  "provider" IN ('legacy-kuula', 'venviewer-native')
);

ALTER TABLE "Tour" ADD CONSTRAINT "Tour_provider_kuula_check" CHECK (
  ("provider" = 'legacy-kuula' AND "kuulaUrl" IS NOT NULL)
  OR ("provider" = 'venviewer-native' AND "kuulaUrl" IS NULL)
);

CREATE TABLE "Scene" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "panoramaAssetId" TEXT NOT NULL,
    "thumbnailAssetId" TEXT,
    "defaultYaw" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "defaultPitch" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "defaultFov" DOUBLE PRECISION NOT NULL DEFAULT 75,
    "floor" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "positionX" DOUBLE PRECISION,
    "positionY" DOUBLE PRECISION,
    "positionZ" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SceneConnection" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "sourceSceneId" TEXT NOT NULL,
    "destinationSceneId" TEXT NOT NULL,
    "travelHeading" DOUBLE PRECISION,
    "arrivalYaw" DOUBLE PRECISION,
    "arrivalPitch" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "transitionType" TEXT NOT NULL DEFAULT 'cut',

    CONSTRAINT "SceneConnection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Scene_tourId_idx" ON "Scene"("tourId");

CREATE INDEX "SceneConnection_tourId_idx" ON "SceneConnection"("tourId");

CREATE INDEX "SceneConnection_sourceSceneId_idx" ON "SceneConnection"("sourceSceneId");

CREATE INDEX "SceneConnection_destinationSceneId_idx" ON "SceneConnection"("destinationSceneId");

ALTER TABLE "Scene" ADD CONSTRAINT "Scene_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SceneConnection" ADD CONSTRAINT "SceneConnection_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SceneConnection" ADD CONSTRAINT "SceneConnection_sourceSceneId_fkey" FOREIGN KEY ("sourceSceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SceneConnection" ADD CONSTRAINT "SceneConnection_destinationSceneId_fkey" FOREIGN KEY ("destinationSceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;
