import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  initialNavigationSession,
  presentTour,
  tourProviderLabel,
  type StoredTour,
} from "@/lib/providers/present";

const scene = {
  id: "scene_lobby",
  title: "Lobby",
  panoramaAssetId: "/panoramas/lobby.jpg",
  thumbnailAssetId: null,
  defaultYaw: 0.25,
  defaultPitch: 0,
  defaultFov: 80,
  floor: "1",
  sortOrder: 0,
  positionX: 1,
  positionY: 0,
  positionZ: 2,
};

function nativeRecord(overrides: Partial<StoredTour> = {}): StoredTour {
  return {
    id: "tour_lobby",
    title: "Lobby",
    slug: "lobby",
    provider: "venviewer-native",
    kuulaUrl: null,
    published: true,
    defaultSceneId: "scene_lobby",
    scenes: [scene],
    connections: [
      {
        id: "edge_1",
        sourceSceneId: "scene_lobby",
        destinationSceneId: "scene_missing",
        travelHeading: null,
        arrivalYaw: null,
        arrivalPitch: null,
        weight: 1,
        enabled: true,
        transitionType: "cut",
      },
    ],
    ...overrides,
  };
}

describe("provider selection", () => {
  it("keeps a legacy tour on the Kuula adapter", () => {
    const presentation = presentTour({
      id: "tour_legacy",
      title: "Falls",
      slug: "falls",
      provider: "legacy-kuula",
      kuulaUrl: "HTTPS://WWW.KUULA.CO/share/abc/",
      published: true,
      defaultSceneId: null,
    });
    expect(presentation).toEqual({
      ok: true,
      provider: "legacy-kuula",
      title: "Falls",
      embedUrl: "https://www.kuula.co/share/abc",
    });
    expect(presentation).not.toHaveProperty("scenes");
  });

  it("presents a native tour without Kuula fields", () => {
    const record = nativeRecord({ connections: [] });
    const presentation = presentTour(record);
    expect(presentation).toMatchObject({
      ok: true,
      provider: "venviewer-native",
      initialSceneId: "scene_lobby",
      scenes: [
        {
          id: "scene_lobby",
          textureUrl: "/panoramas/lobby.jpg",
          yaw: 0.25,
          fov: 80,
        },
      ],
    });
    expect(JSON.stringify(presentation)).not.toContain("kuula");
    expect(initialNavigationSession(record)?.currentSceneId).toBe(
      "scene_lobby",
    );
    expect(tourProviderLabel("venviewer-native")).toBe("Venviewer");
    expect(tourProviderLabel("legacy-kuula")).toBe("Legacy Kuula");
  });

  it("refuses a native record that still carries a Kuula URL or a broken graph", () => {
    expect(
      presentTour(nativeRecord({ kuulaUrl: "https://kuula.co/share/abc" })).ok,
    ).toBe(false);
    expect(presentTour(nativeRecord()).ok).toBe(false);
    expect(
      presentTour(
        nativeRecord({
          connections: [],
          scenes: [
            { ...scene, panoramaAssetId: "https://cdn.example/lobby.jpg" },
          ],
        }),
      ).ok,
    ).toBe(false);
    expect(
      presentTour({
        id: "tour_legacy",
        title: "Falls",
        slug: "falls",
        provider: "legacy-kuula",
        kuulaUrl: null,
        published: true,
        defaultSceneId: null,
      }).ok,
    ).toBe(false);
  });

  it("keeps the database constraint that native tours cannot store Kuula URLs", () => {
    const postgres = readFileSync(
      "prisma/migrations/20261006140000_native_runtime/migration.sql",
      "utf8",
    );
    const sqlite = readFileSync(
      "prisma/sqlite/migrations/20261006140000_native_runtime/migration.sql",
      "utf8",
    );
    for (const sql of [postgres, sqlite]) {
      expect(sql).toContain("legacy-kuula");
      expect(sql).toContain("venviewer-native");
      expect(sql).toContain('"kuulaUrl" IS NULL');
    }
  });
});
