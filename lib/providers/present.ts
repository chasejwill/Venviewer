import { kuulaEmbedUrl } from "@/lib/providers/legacy-kuula";
import {
  createNavigationSession,
  parseSpatialTour,
  type SceneNode,
} from "@/lib/spatial/model";

export const tourViewerInclude = {
  scenes: { orderBy: { sortOrder: "asc" as const } },
  connections: true,
};

export type StoredScene = {
  id: string;
  title: string;
  panoramaAssetId: string;
  thumbnailAssetId: string | null;
  defaultYaw: number;
  defaultPitch: number;
  defaultFov: number;
  floor: string | null;
  sortOrder: number;
  positionX: number | null;
  positionY: number | null;
  positionZ: number | null;
};

export type StoredConnection = {
  id: string;
  sourceSceneId: string;
  destinationSceneId: string;
  travelHeading: number | null;
  arrivalYaw: number | null;
  arrivalPitch: number | null;
  weight: number;
  enabled: boolean;
  transitionType: string;
};

export type StoredTour = {
  id: string;
  title: string;
  slug: string;
  provider: string;
  kuulaUrl: string | null;
  published: boolean;
  defaultSceneId: string | null;
  scenes?: StoredScene[];
  connections?: StoredConnection[];
};

export type NativeSceneView = {
  id: string;
  title: string;
  textureUrl: string;
  yaw: number;
  pitch: number;
  fov: number;
};

export type ViewerPresentation =
  | {
      ok: true;
      provider: "legacy-kuula";
      title: string;
      embedUrl: string;
    }
  | {
      ok: true;
      provider: "venviewer-native";
      title: string;
      initialSceneId: string;
      scenes: NativeSceneView[];
    }
  | {
      ok: false;
      title: string;
      message: string;
    };

const UNAVAILABLE = "This tour cannot be displayed.";

export function tourProviderLabel(provider: string): string {
  if (provider === "legacy-kuula") return "Legacy Kuula";
  if (provider === "venviewer-native") return "Venviewer";
  return "Unknown";
}

export function spatialTourFromRecord(record: StoredTour) {
  const scenes = [...(record.scenes ?? [])].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder || left.id.localeCompare(right.id),
  );
  const defaultSceneId = record.defaultSceneId ?? scenes[0]?.id ?? "";
  return {
    id: record.id,
    title: record.title,
    slug: record.slug,
    status: record.published ? "published" : "draft",
    defaultSceneId,
    scenes: scenes.map(toSceneNode),
    connections: (record.connections ?? []).map(toConnection),
    interactionRegions: [],
    destinations: [],
    guidedExperience: null,
  };
}

export function presentTour(record: StoredTour): ViewerPresentation {
  if (record.provider === "legacy-kuula") {
    if (!record.kuulaUrl) {
      return { ok: false, title: record.title, message: UNAVAILABLE };
    }
    try {
      return {
        ok: true,
        provider: "legacy-kuula",
        title: record.title,
        embedUrl: kuulaEmbedUrl(record.kuulaUrl),
      };
    } catch {
      return { ok: false, title: record.title, message: UNAVAILABLE };
    }
  }

  if (record.provider !== "venviewer-native" || record.kuulaUrl) {
    return { ok: false, title: record.title, message: UNAVAILABLE };
  }

  const parsed = parseSpatialTour(spatialTourFromRecord(record));
  if (!parsed.success) {
    return { ok: false, title: record.title, message: UNAVAILABLE };
  }
  return {
    ok: true,
    provider: "venviewer-native",
    title: record.title,
    initialSceneId: parsed.data.defaultSceneId,
    scenes: parsed.data.scenes.map((scene) => ({
      id: scene.id,
      title: scene.title,
      textureUrl: scene.panoramaAssetId,
      yaw: scene.orientation.yaw,
      pitch: scene.orientation.pitch,
      fov: scene.orientation.fov,
    })),
  };
}

export function nativeTourIsPublishable(record: StoredTour): boolean {
  const presentation = presentTour({ ...record, provider: "venviewer-native" });
  return presentation.ok && presentation.provider === "venviewer-native";
}

export function initialNavigationSession(record: StoredTour) {
  const parsed = parseSpatialTour(spatialTourFromRecord(record));
  if (!parsed.success) return null;
  return createNavigationSession(parsed.data);
}

function toSceneNode(scene: StoredScene): SceneNode {
  const { positionX, positionY, positionZ } = scene;
  return {
    id: scene.id,
    title: scene.title,
    panoramaAssetId: scene.panoramaAssetId,
    thumbnailAssetId: scene.thumbnailAssetId,
    orientation: {
      yaw: scene.defaultYaw,
      pitch: scene.defaultPitch,
      fov: scene.defaultFov,
    },
    position:
      positionX !== null && positionY !== null && positionZ !== null
        ? { x: positionX, y: positionY, z: positionZ }
        : null,
    floor: scene.floor,
  };
}

function toConnection(connection: StoredConnection) {
  return {
    id: connection.id,
    sourceSceneId: connection.sourceSceneId,
    destinationSceneId: connection.destinationSceneId,
    travelHeading: connection.travelHeading,
    arrivalYaw: connection.arrivalYaw,
    arrivalPitch: connection.arrivalPitch,
    weight: connection.weight,
    enabled: connection.enabled,
    transitionType: connection.transitionType,
  };
}
