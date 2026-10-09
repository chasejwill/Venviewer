import { extractReferrerDomain } from "@/lib/embed/policy";
import type { AnalyticsStore } from "@/lib/analytics/capture";
import { db } from "@/lib/db";

const VIEW_TYPES = ["viewer_load", "tour_view", "embed_load"];

export const prismaAnalyticsStore: AnalyticsStore = {
  async findPublishedTour(tourId) {
    return db.tour.findFirst({
      where: { id: tourId, published: true },
      select: { id: true },
    });
  },
  async hasVisitorView(tourId, visitorKey) {
    const existing = await db.tourEvent.findFirst({
      where: { tourId, visitorKey, type: { in: VIEW_TYPES } },
      select: { id: true },
    });
    return Boolean(existing);
  },
  async record(input) {
    await db.$transaction([
      db.tourEvent.create({
        data: {
          tourId: input.tourId,
          type: input.type,
          surface: input.surface,
          metadata: input.metadata,
          referrerDomain: input.referrerDomain,
          visitorKey: input.visitorKey,
        },
      }),
      db.tourAnalytics.upsert({
        where: { tourId: input.tourId },
        create: {
          tourId: input.tourId,
          views: input.views,
          uniqueViews: input.uniqueViews,
          embedViews: input.embedViews,
          lastViewedAt: input.touchLastViewed ? new Date() : null,
        },
        update: {
          views: { increment: input.views },
          uniqueViews: { increment: input.uniqueViews },
          embedViews: { increment: input.embedViews },
          ...(input.touchLastViewed ? { lastViewedAt: new Date() } : {}),
        },
      }),
    ]);
  },
};

export function referrerDomainFromRequest(request: Request): string | null {
  return extractReferrerDomain(request.headers.get("referer"));
}
