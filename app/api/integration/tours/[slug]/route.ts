import { jsonError } from "@/lib/api/admin-route";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { toIntegrationTour } from "@/lib/integration/map-tour";
import { buildVenviewerIntegrationPayload } from "@/lib/integration/tour-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const tour = await db.tour.findUnique({ where: { slug } });
  if (!tour) return jsonError("Tour not found.", 404);

  const payload = buildVenviewerIntegrationPayload(
    toIntegrationTour(tour, getEnv().VENVIEWER_LITE_BASE_URL),
  );
  return Response.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
