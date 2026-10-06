PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Tour" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'legacy-kuula',
    "kuulaUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "defaultSceneId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tour_provider_check" CHECK ("provider" IN ('legacy-kuula', 'venviewer-native')),
    CONSTRAINT "Tour_provider_kuula_check" CHECK (
        ("provider" = 'legacy-kuula' AND "kuulaUrl" IS NOT NULL) OR
        ("provider" = 'venviewer-native' AND "kuulaUrl" IS NULL)
    )
);

INSERT INTO "new_Tour" ("id", "title", "slug", "provider", "kuulaUrl", "published", "createdAt", "updatedAt")
SELECT "id", "title", "slug", 'legacy-kuula', "kuulaUrl", "published", "createdAt", "updatedAt"
FROM "Tour";

DROP TABLE "Tour";

ALTER TABLE "new_Tour" RENAME TO "Tour";

CREATE UNIQUE INDEX "Tour_slug_key" ON "Tour"("slug");

CREATE TABLE "Scene" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tourId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "panoramaAssetId" TEXT NOT NULL,
    "thumbnailAssetId" TEXT,
    "defaultYaw" REAL NOT NULL DEFAULT 0,
    "defaultPitch" REAL NOT NULL DEFAULT 0,
    "defaultFov" REAL NOT NULL DEFAULT 75,
    "floor" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "positionX" REAL,
    "positionY" REAL,
    "positionZ" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Scene_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "SceneConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tourId" TEXT NOT NULL,
    "sourceSceneId" TEXT NOT NULL,
    "destinationSceneId" TEXT NOT NULL,
    "travelHeading" REAL,
    "arrivalYaw" REAL,
    "arrivalPitch" REAL,
    "weight" REAL NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "transitionType" TEXT NOT NULL DEFAULT 'cut',
    CONSTRAINT "SceneConnection_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SceneConnection_sourceSceneId_fkey" FOREIGN KEY ("sourceSceneId") REFERENCES "Scene" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SceneConnection_destinationSceneId_fkey" FOREIGN KEY ("destinationSceneId") REFERENCES "Scene" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Scene_tourId_idx" ON "Scene"("tourId");

CREATE INDEX "SceneConnection_tourId_idx" ON "SceneConnection"("tourId");

CREATE INDEX "SceneConnection_sourceSceneId_idx" ON "SceneConnection"("sourceSceneId");

CREATE INDEX "SceneConnection_destinationSceneId_idx" ON "SceneConnection"("destinationSceneId");

PRAGMA foreign_keys=ON;
