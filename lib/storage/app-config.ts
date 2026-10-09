import {
  createStorageProviderFromResolved,
  resetStorageProviderCache,
  resolveStorageConfig,
} from "@/lib/storage/factory";
import type { ResolvedStorageConfig, StorageEnv } from "@/lib/storage/config";
import type { StorageProvider } from "@/lib/storage/types";

/**
 * Asset storage is resolved only when an asset route or the health probe asks
 * for it. Importing this module does not read R2 settings, so the rest of the
 * site keeps booting when production has no object storage yet.
 */
export class AssetStorageUnavailableError extends Error {
  readonly code = "ASSET_STORAGE_UNAVAILABLE";

  constructor(message: string) {
    super(message);
    this.name = "AssetStorageUnavailableError";
  }
}

export function resolveAppStorageConfig(
  env: StorageEnv = process.env,
): ResolvedStorageConfig {
  const production = env.VENVIEWER_LITE_DEPLOY_ENV === "production";
  try {
    return resolveStorageConfig({
      ...env,
      VENVIEWER_DEPLOY_ENV: production ? "production" : "development",
      STORAGE_PROVIDER:
        env.STORAGE_PROVIDER?.trim() || (production ? undefined : "local"),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Asset storage is not configured.";
    throw new AssetStorageUnavailableError(message);
  }
}

let cached: StorageProvider | null = null;

export function getAppStorageProvider(
  env: StorageEnv = process.env,
): StorageProvider {
  if (cached) return cached;
  const config = resolveAppStorageConfig(env);
  cached = createStorageProviderFromResolved(config);
  return cached;
}

export function resetAppStorageForTests(): void {
  cached = null;
  resetStorageProviderCache();
}
