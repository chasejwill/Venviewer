import { z } from "zod";
import {
  ANALYTICS_EVENT_TYPES,
  ANALYTICS_SURFACES,
  captureAnalyticsEvent,
  visitorKeyForRequest,
} from "@/lib/analytics/capture";
import {
  prismaAnalyticsStore,
  referrerDomainFromRequest,
} from "@/lib/analytics/prisma-store";
import { checkAnalyticsRateLimit } from "@/lib/analytics/rate-limit";
import { jsonError } from "@/lib/api/admin-route";
import { getEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

const eventSchema = z.object({
  tourId: z.string().trim().min(1),
  type: z.enum(ANALYTICS_EVENT_TYPES),
  surface: z.enum(ANALYTICS_SURFACES).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

function clientAddress(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: Request) {
  const limit = checkAnalyticsRateLimit(clientAddress(request));
  if (!limit.allowed) {
    return jsonError("Too many analytics events.", 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Expected a JSON event.", 400);
  }
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid analytics event.", 400);

  const env = getEnv();
  const result = await captureAnalyticsEvent(
    prismaAnalyticsStore,
    {
      ...parsed.data,
      referrer: request.headers.get("referer"),
      visitorKey: visitorKeyForRequest(
        clientAddress(request),
        request.headers.get("user-agent") ?? "",
        env.VENVIEWER_LITE_SESSION_SECRET,
      ),
    },
    referrerDomainFromRequest(request),
  );
  if (!result.ok) return jsonError(result.error, result.status);
  return Response.json({ ok: true });
}
