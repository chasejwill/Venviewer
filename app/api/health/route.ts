import { probeHealth } from "@/lib/health/probe";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = await probeHealth();
  return Response.json(report.body, {
    status: report.status,
    headers: { "Cache-Control": "no-store" },
  });
}
