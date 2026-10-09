import type { StorageProviderType } from "./types";

export type DeployEnvironment = "development" | "staging" | "production";

export interface R2StorageConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
  region: string;
}

export interface ResolvedStorageConfig {
  type: StorageProviderType;
  deployEnvironment: DeployEnvironment;
  defaultBucket: string;
  localRootPath?: string;
  publicBaseUrl?: string;
  r2?: R2StorageConfig;
}

/** String env bag. Wider than `NodeJS.ProcessEnv`, whose `NODE_ENV` is required in this app. */
export type StorageEnv = Record<string, string | undefined>;

function required(env: StorageEnv, key: string): string {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function resolveDeployEnvironment(
  env: StorageEnv = process.env,
): DeployEnvironment {
  const value = (env.VENVIEWER_DEPLOY_ENV ?? "development")
    .trim()
    .toLowerCase();
  if (value === "staging" || value === "production") return value;
  return "development";
}

export function resolveStorageConfig(
  env: StorageEnv = process.env,
): ResolvedStorageConfig {
  const deployEnvironment = resolveDeployEnvironment(env);
  const type = (env.STORAGE_PROVIDER ?? "local") as StorageProviderType;
  const defaultBucket =
    env.STORAGE_BUCKET ??
    (type === "local" ? "venviewer-local" : (env.R2_BUCKET ?? ""));

  if (
    (deployEnvironment === "staging" || deployEnvironment === "production") &&
    type !== "r2"
  ) {
    throw new Error(
      `STORAGE_PROVIDER must be "r2" in ${deployEnvironment}. Local storage is not permitted outside development.`,
    );
  }

  if (type === "r2") {
    const bucket = required(env, "R2_BUCKET");
    return {
      type,
      deployEnvironment,
      defaultBucket: bucket,
      publicBaseUrl:
        env.VENVIEWER_BASE_URL ?? env.NEXT_PUBLIC_VENVIEWER_BASE_URL,
      r2: {
        accountId: required(env, "R2_ACCOUNT_ID"),
        accessKeyId: required(env, "R2_ACCESS_KEY_ID"),
        secretAccessKey: required(env, "R2_SECRET_ACCESS_KEY"),
        bucket,
        endpoint: required(env, "R2_ENDPOINT"),
        region: env.R2_REGION?.trim() || "auto",
      },
    };
  }

  if (type !== "local") {
    throw new Error(
      `Storage provider "${type}" is not implemented. Supported providers: local, r2.`,
    );
  }

  return {
    type,
    deployEnvironment,
    defaultBucket,
    localRootPath: env.STORAGE_LOCAL_ROOT,
    publicBaseUrl: env.VENVIEWER_BASE_URL ?? env.NEXT_PUBLIC_VENVIEWER_BASE_URL,
  };
}

export function validateR2Config(config: R2StorageConfig): string[] {
  const errors: string[] = [];
  if (!config.accountId) errors.push("R2_ACCOUNT_ID is required.");
  if (!config.accessKeyId) errors.push("R2_ACCESS_KEY_ID is required.");
  if (!config.secretAccessKey) errors.push("R2_SECRET_ACCESS_KEY is required.");
  if (!config.bucket) errors.push("R2_BUCKET is required.");
  if (!config.endpoint) errors.push("R2_ENDPOINT is required.");
  return errors;
}
