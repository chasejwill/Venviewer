import { db } from "@/lib/db";
import {
  AssetStorageUnavailableError,
  getAppStorageProvider,
} from "@/lib/storage/app-config";

export type HealthReport = {
  ok: boolean;
  database: "ok" | "unavailable";
  storage: "ok" | "not_configured" | "unavailable" | "skipped";
};

export async function probeHealth(): Promise<{
  status: 200 | 503;
  body: HealthReport;
}> {
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    return {
      status: 503,
      body: { ok: false, database: "unavailable", storage: "skipped" },
    };
  }

  try {
    const provider = getAppStorageProvider();
    await provider.objectExists(provider.defaultBucket, "health/probe");
    return {
      status: 200,
      body: { ok: true, database: "ok", storage: "ok" },
    };
  } catch (error) {
    if (error instanceof AssetStorageUnavailableError) {
      return {
        status: 200,
        body: { ok: true, database: "ok", storage: "not_configured" },
      };
    }
    return {
      status: 200,
      body: { ok: true, database: "ok", storage: "unavailable" },
    };
  }
}
