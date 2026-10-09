import { describe, expect, it } from "vitest";
import {
  AssetStorageUnavailableError,
  resolveAppStorageConfig,
} from "@/lib/storage/app-config";

const r2 = {
  R2_ACCOUNT_ID: "acct",
  R2_ACCESS_KEY_ID: "key",
  R2_SECRET_ACCESS_KEY: "secret",
  R2_BUCKET: "venviewer",
  R2_ENDPOINT: "https://acct.r2.cloudflarestorage.com",
};

describe("app storage configuration", () => {
  it("defaults to the local driver outside production", () => {
    const config = resolveAppStorageConfig({
      VENVIEWER_LITE_DEPLOY_ENV: "development",
    });
    expect(config.type).toBe("local");
    expect(config.defaultBucket).toBe("venviewer-local");
  });

  it("fails in production when R2 is not configured", () => {
    expect(() =>
      resolveAppStorageConfig({
        VENVIEWER_LITE_DEPLOY_ENV: "production",
      }),
    ).toThrow(AssetStorageUnavailableError);
    expect(() =>
      resolveAppStorageConfig({
        VENVIEWER_LITE_DEPLOY_ENV: "production",
        STORAGE_PROVIDER: "local",
      }),
    ).toThrow(/must be "r2"/);
  });

  it("resolves R2 in production without renaming Lite variables", () => {
    const config = resolveAppStorageConfig({
      VENVIEWER_LITE_DEPLOY_ENV: "production",
      VENVIEWER_LITE_BASE_URL: "https://viewer.example",
      STORAGE_PROVIDER: "r2",
      ...r2,
    });
    expect(config.type).toBe("r2");
    expect(config.r2?.bucket).toBe("venviewer");
  });
});
