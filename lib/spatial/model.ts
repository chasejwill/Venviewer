import { z } from "zod";

export const TOUR_PROVIDERS = ["legacy-kuula", "venviewer-native"] as const;
export type TourProviderId = (typeof TOUR_PROVIDERS)[number];

export const INTERACTION_INTENTS = [
  "LOOK",
  "GO",
  "INFO",
  "CTA",
  "DESTINATION",
] as const;

export const TRANSITION_TYPES = ["cut", "crossfade"] as const;
export type TransitionType = (typeof TRANSITION_TYPES)[number];

const sceneIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Scene ids use letters, numbers, underscores, and hyphens.",
  );

/**
 * Panorama identities are same-origin delivery paths. They are storage
 * references, not third-party viewer URLs.
 */
export function isSafePanoramaAssetId(value: string): boolean {
  if (
    !/^\/panoramas\/[A-Za-z0-9/._-]+\.(?:jpe?g|png|webp)$/.test(value) ||
    value.length > 240
  ) {
    return false;
  }
  const segments = value.split("/");
  return segments.every(
    (segment, index) =>
      index === 0 || (segment !== "" && segment !== "." && segment !== ".."),
  );
}

const panoramaAssetSchema = z
  .string()
  .refine(isSafePanoramaAssetId, "Use a same-origin panorama asset path.");

const radiansSchema = z.number().finite();
const fovSchema = z.number().finite().gt(0).max(160);

const positionSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite(),
});

export const sceneNodeSchema = z.object({
  id: sceneIdSchema,
  title: z.string().trim().min(1).max(120),
  panoramaAssetId: panoramaAssetSchema,
  thumbnailAssetId: panoramaAssetSchema.nullable(),
  orientation: z.object({
    yaw: radiansSchema,
    pitch: radiansSchema,
    fov: fovSchema,
  }),
  position: positionSchema.nullable(),
  floor: z.string().trim().min(1).max(40).nullable(),
});

export const sceneConnectionSchema = z.object({
  id: sceneIdSchema,
  sourceSceneId: sceneIdSchema,
  destinationSceneId: sceneIdSchema,
  travelHeading: radiansSchema.nullable(),
  arrivalYaw: radiansSchema.nullable(),
  arrivalPitch: radiansSchema.nullable(),
  weight: z.number().finite().positive(),
  enabled: z.boolean(),
  transitionType: z.enum(TRANSITION_TYPES),
});

export const interactionRegionSchema = z.object({
  id: sceneIdSchema,
  sceneId: sceneIdSchema,
  intent: z.enum(INTERACTION_INTENTS),
  yaw: radiansSchema,
  pitch: radiansSchema,
  label: z.string().trim().min(1).max(80).nullable(),
  destinationId: sceneIdSchema.nullable(),
  visible: z.boolean(),
});

export const destinationSchema = z.object({
  id: sceneIdSchema,
  name: z.string().trim().min(1).max(80),
  sceneIds: z.array(sceneIdSchema).min(1),
});

export const guidedExperienceSchema = z.object({
  id: sceneIdSchema,
  title: z.string().trim().min(1).max(80),
  sceneIds: z.array(sceneIdSchema).min(1),
});

export const spatialTourSchema = z
  .object({
    id: sceneIdSchema,
    title: z.string().trim().min(1).max(120),
    slug: z.string().trim().min(1).max(80),
    status: z.enum(["draft", "published"]),
    defaultSceneId: sceneIdSchema,
    scenes: z.array(sceneNodeSchema).min(1),
    connections: z.array(sceneConnectionSchema),
    interactionRegions: z.array(interactionRegionSchema),
    destinations: z.array(destinationSchema),
    guidedExperience: guidedExperienceSchema.nullable(),
  })
  .superRefine((tour, context) => {
    const sceneIds = new Set(tour.scenes.map((scene) => scene.id));
    if (sceneIds.size !== tour.scenes.length) {
      context.addIssue({
        code: "custom",
        path: ["scenes"],
        message: "Scene ids must be unique.",
      });
    }
    if (!sceneIds.has(tour.defaultSceneId)) {
      context.addIssue({
        code: "custom",
        path: ["defaultSceneId"],
        message: "The default scene must belong to the tour.",
      });
    }
    const connectionIds = new Set<string>();
    for (const [index, connection] of tour.connections.entries()) {
      if (connectionIds.has(connection.id)) {
        context.addIssue({
          code: "custom",
          path: ["connections", index, "id"],
          message: "Connection ids must be unique.",
        });
      }
      connectionIds.add(connection.id);
      if (
        !sceneIds.has(connection.sourceSceneId) ||
        !sceneIds.has(connection.destinationSceneId)
      ) {
        context.addIssue({
          code: "custom",
          path: ["connections", index],
          message: "Connections must join scenes in this tour.",
        });
      }
      if (connection.sourceSceneId === connection.destinationSceneId) {
        context.addIssue({
          code: "custom",
          path: ["connections", index],
          message: "A scene cannot connect to itself.",
        });
      }
    }
    for (const [index, region] of tour.interactionRegions.entries()) {
      if (!sceneIds.has(region.sceneId)) {
        context.addIssue({
          code: "custom",
          path: ["interactionRegions", index, "sceneId"],
          message: "Interaction regions must belong to a scene in this tour.",
        });
      }
    }
    const destinationIds = new Set(tour.destinations.map((item) => item.id));
    for (const [index, destination] of tour.destinations.entries()) {
      if (!destination.sceneIds.every((sceneId) => sceneIds.has(sceneId))) {
        context.addIssue({
          code: "custom",
          path: ["destinations", index, "sceneIds"],
          message: "Destinations must reference scenes in this tour.",
        });
      }
    }
    for (const [index, region] of tour.interactionRegions.entries()) {
      if (region.destinationId && !destinationIds.has(region.destinationId)) {
        context.addIssue({
          code: "custom",
          path: ["interactionRegions", index, "destinationId"],
          message:
            "The destination selection must reference a known destination.",
        });
      }
    }
    if (
      tour.guidedExperience &&
      !tour.guidedExperience.sceneIds.every((sceneId) => sceneIds.has(sceneId))
    ) {
      context.addIssue({
        code: "custom",
        path: ["guidedExperience", "sceneIds"],
        message: "A guided experience must reference scenes in this tour.",
      });
    }
  });

export type SceneNode = z.infer<typeof sceneNodeSchema>;
export type SceneConnection = z.infer<typeof sceneConnectionSchema>;
export type InteractionRegion = z.infer<typeof interactionRegionSchema>;
export type Destination = z.infer<typeof destinationSchema>;
export type GuidedExperience = z.infer<typeof guidedExperienceSchema>;
export type SpatialTour = z.infer<typeof spatialTourSchema>;

export type RouteStep = {
  sceneId: string;
  arrivalYaw: number | null;
  arrivalPitch: number | null;
  transitionType: TransitionType;
};

/** Calculated traversal. Pathfinding is intentionally not implemented here. */
export type SpatialRoute = {
  destinationId: string | null;
  steps: RouteStep[];
};

export type NavigationSessionState = {
  currentSceneId: string;
  yaw: number;
  pitch: number;
  fov: number;
  route: SpatialRoute | null;
  routeIndex: number;
  interrupted: boolean;
  history: string[];
};

export function parseSpatialTour(input: unknown) {
  return spatialTourSchema.safeParse(input);
}

export function createNavigationSession(
  tour: SpatialTour,
): NavigationSessionState {
  const scene = tour.scenes.find((item) => item.id === tour.defaultSceneId);
  if (!scene) {
    throw new Error("The default scene must belong to the tour.");
  }
  return {
    currentSceneId: scene.id,
    yaw: scene.orientation.yaw,
    pitch: scene.orientation.pitch,
    fov: scene.orientation.fov,
    route: null,
    routeIndex: 0,
    interrupted: false,
    history: [scene.id],
  };
}
