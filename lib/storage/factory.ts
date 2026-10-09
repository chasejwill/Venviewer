import {
  resolveStorageConfig,
  type ResolvedStorageConfig,
  type StorageEnv,
} from "./config";
import { LocalStorageProvider } from "./providers/local";
import { R2StorageProvider } from "./providers/r2";
import type { StorageProvider, StorageProviderConfig } from "./types";

export function createStorageProvider(
  config: StorageProviderConfig,
): StorageProvider {
  switch (config.type) {
    case "local":
      return new LocalStorageProvider(config);
    case "r2":
      if (!config.r2) {
        throw new Error(
          "R2 configuration is required for the r2 storage provider.",
        );
      }
      return new R2StorageProvider({
        config: config.r2,
        appBaseUrl: config.publicBaseUrl,
      });
    case "s3":
    case "gcs":
    case "azure":
    case "self_hosted":
      throw new Error(
        `Storage provider "${config.type}" is not implemented. Supported providers: local, r2.`,
      );
    default:
      throw new Error(`Unknown storage provider: ${config.type as string}`);
  }
}

export function createStorageProviderFromResolved(
  config: ResolvedStorageConfig,
): StorageProvider {
  if (config.type === "r2") {
    if (!config.r2) throw new Error("R2 configuration is missing.");
    return new R2StorageProvider({
      config: config.r2,
      appBaseUrl: config.publicBaseUrl,
    });
  }

  return new LocalStorageProvider({
    type: "local",
    localRootPath: config.localRootPath,
    defaultBucket: config.defaultBucket,
    publicBaseUrl: config.publicBaseUrl,
  });
}

let cachedProvider: StorageProvider | null = null;

export function createStorageProviderFromEnv(
  env: StorageEnv = process.env,
): StorageProvider {
  if (cachedProvider) return cachedProvider;
  const resolved = resolveStorageConfig(env);
  cachedProvider = createStorageProviderFromResolved(resolved);
  return cachedProvider;
}

export function resetStorageProviderCache(): void {
  cachedProvider = null;
}

export { resolveStorageConfig, resolveDeployEnvironment } from "./config";
