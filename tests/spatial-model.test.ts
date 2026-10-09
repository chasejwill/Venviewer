import { describe, expect, it } from "vitest";
import {
  createNavigationSession,
  isSafePanoramaAssetId,
  parseSpatialTour,
  type SpatialTour,
} from "@/lib/spatial/model";

const tour: SpatialTour = {
  id: "tour_lobby",
  title: "Lobby",
  slug: "lobby",
  status: "published",
  defaultSceneId: "scene_lobby",
  scenes: [
    {
      id: "scene_lobby",
      title: "Lobby",
      panoramaAssetId: "/panoramas/lobby.jpg",
      thumbnailAssetId: null,
      orientation: { yaw: 0.2, pitch: 0, fov: 75 },
      position: { x: 0, y: 0, z: 0 },
      floor: "1",
    },
    {
      id: "scene_hall",
      title: "Hall",
      panoramaAssetId: "/panoramas/hall.webp",
      thumbnailAssetId: "/panoramas/hall-thumb.webp",
      orientation: { yaw: 1, pitch: -0.1, fov: 70 },
      position: null,
      floor: "1",
    },
  ],
  connections: [
    {
      id: "edge_hall",
      sourceSceneId: "scene_lobby",
      destinationSceneId: "scene_hall",
      travelHeading: 0.4,
      arrivalYaw: 1,
      arrivalPitch: 0,
      weight: 2,
      enabled: true,
      transitionType: "crossfade",
    },
  ],
  interactionRegions: [
    {
      id: "region_desk",
      sceneId: "scene_lobby",
      intent: "LOOK",
      yaw: 0.3,
      pitch: 0.1,
      label: "Desk",
      destinationId: null,
      visible: false,
    },
  ],
  destinations: [{ id: "dest_hall", name: "Hall", sceneIds: ["scene_hall"] }],
  guidedExperience: null,
};

describe("spatial scene model", () => {
  it("accepts a native tour that is more than a list of panorama URLs", () => {
    expect(parseSpatialTour(tour).success).toBe(true);
    const session = createNavigationSession(tour);
    expect(session).toMatchObject({
      currentSceneId: "scene_lobby",
      yaw: 0.2,
      route: null,
      interrupted: false,
      history: ["scene_lobby"],
    });
  });

  it("rejects provider URLs, traversal, and disconnected graph records", () => {
    expect(isSafePanoramaAssetId("https://kuula.co/share/abc")).toBe(false);
    expect(isSafePanoramaAssetId("/panoramas/../secret.jpg")).toBe(false);
    expect(isSafePanoramaAssetId("/panoramas//lobby.jpg")).toBe(false);
    expect(isSafePanoramaAssetId("/panoramas/lobby.jpg")).toBe(true);

    const invalid = parseSpatialTour({
      ...tour,
      scenes: [
        {
          ...tour.scenes[0],
          panoramaAssetId: "https://kuula.co/share/abc",
        },
      ],
      connections: [
        {
          ...tour.connections[0],
          destinationSceneId: "scene_missing",
        },
      ],
    });
    expect(invalid.success).toBe(false);
  });

  it("rejects a connection from a scene to itself", () => {
    const result = parseSpatialTour({
      ...tour,
      connections: [
        {
          ...tour.connections[0],
          destinationSceneId: "scene_lobby",
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});
