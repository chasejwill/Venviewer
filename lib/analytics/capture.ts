import { createHmac } from "node:crypto";
import type { TourAnalyticsEventType } from "@/lib/embed/tour-types";

export const ANALYTICS_EVENT_TYPES = [
  "viewer_load",
  "tour_view",
  "cta_click",
  "embed_load",
  "fullscreen_enter",
  "provider_error",
] as const satisfies readonly TourAnalyticsEventType[];

export const ANALYTICS_SURFACES = [
  "viewer",
  "embed",
  "preview",
  "dashboard",
] as const;

const VIEW_TYPES = new Set<TourAnalyticsEventType>([
  "viewer_load",
  "tour_view",
  "embed_load",
]);

const METADATA_LIMIT = 2_000;

export type AnalyticsInput = {
  tourId: string;
  type: TourAnalyticsEventType;
  surface?: (typeof ANALYTICS_SURFACES)[number];
  metadata?: Record<string, unknown>;
  referrer: string | null;
  visitorKey: string | null;
};

export type AnalyticsStore = {
  findPublishedTour(tourId: string): Promise<{ id: string } | null>;
  hasVisitorView(tourId: string, visitorKey: string): Promise<boolean>;
  record(input: {
    tourId: string;
    type: string;
    surface: string | null;
    metadata: string | null;
    referrerDomain: string | null;
    visitorKey: string | null;
    views: number;
    uniqueViews: number;
    embedViews: number;
    touchLastViewed: boolean;
  }): Promise<void>;
};

export function visitorKeyForRequest(
  ip: string,
  userAgent: string,
  secret: string,
): string {
  return createHmac("sha256", secret)
    .update(`${ip}\n${userAgent}`)
    .digest("hex")
    .slice(0, 32);
}

export function metadataJson(
  metadata: Record<string, unknown> | undefined,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (!metadata) return { ok: true, value: null };
  let encoded: string;
  try {
    encoded = JSON.stringify(metadata);
  } catch {
    return { ok: false, error: "Metadata could not be encoded." };
  }
  if (encoded.length > METADATA_LIMIT) {
    return { ok: false, error: "Metadata is too large." };
  }
  return { ok: true, value: encoded };
}

export async function captureAnalyticsEvent(
  store: AnalyticsStore,
  input: AnalyticsInput,
  referrerDomain: string | null,
): Promise<{ ok: true } | { ok: false; status: 404 | 400; error: string }> {
  const tour = await store.findPublishedTour(input.tourId);
  if (!tour) return { ok: false, status: 404, error: "Tour unavailable." };

  const encoded = metadataJson(input.metadata);
  if (!encoded.ok) return { ok: false, status: 400, error: encoded.error };

  const isView = VIEW_TYPES.has(input.type);
  const alreadySeen =
    isView && input.visitorKey
      ? await store.hasVisitorView(input.tourId, input.visitorKey)
      : true;

  await store.record({
    tourId: input.tourId,
    type: input.type,
    surface: input.surface ?? null,
    metadata: encoded.value,
    referrerDomain,
    visitorKey: input.visitorKey,
    views: input.type === "viewer_load" || input.type === "tour_view" ? 1 : 0,
    embedViews: input.type === "embed_load" ? 1 : 0,
    uniqueViews: isView && input.visitorKey && !alreadySeen ? 1 : 0,
    touchLastViewed: isView,
  });
  return { ok: true };
}
