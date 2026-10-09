import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  resolveDeployEnvironment,
  resolveStorageConfig,
  validateR2Config,
} from "@/lib/storage/config";
import { StorageError } from "@/lib/storage/errors";
import {
  createStorageProvider,
  resetStorageProviderCache,
} from "@/lib/storage/factory";
import { R2StorageProvider } from "@/lib/storage/providers/r2";

describe("LocalStorageProvider", () => {
  let tempRoot = "";

  afterEach(async () => {
    if (tempRoot) await rm(tempRoot, { recursive: true, force: true });
  });

  it("stores and retrieves objects", async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "venviewer-storage-"));
    const provider = createStorageProvider({
      type: "local",
      localRootPath: tempRoot,
      defaultBucket: "test-bucket",
    });

    const reference = await provider.putObject({
      bucket: "test-bucket",
      objectKey: "organizations/org_1/test.jpg",
      body: Buffer.from("hello"),
      mimeType: "image/jpeg",
    });

    expect(reference.objectKey).toContain("organizations/org_1/test.jpg");
    expect(
      await provider.objectExists("test-bucket", reference.objectKey),
    ).toBe(true);

    const object = await provider.getObject("test-bucket", reference.objectKey);
    expect(object.body.toString()).toBe("hello");

    const diskPath = path.join(tempRoot, "test-bucket", reference.objectKey);
    expect(await readFile(diskPath)).toBeDefined();

    await provider.deleteObject("test-bucket", reference.objectKey);
    expect(
      await provider.objectExists("test-bucket", reference.objectKey),
    ).toBe(false);
  });
});

describe("resolveStorageConfig", () => {
  beforeEach(() => resetStorageProviderCache());

  it("defaults to local in development", () => {
    const config = resolveStorageConfig({
      VENVIEWER_DEPLOY_ENV: "development",
      STORAGE_PROVIDER: "local",
    });
    expect(config.type).toBe("local");
    expect(config.deployEnvironment).toBe("development");
  });

  it("requires r2 in production", () => {
    expect(() =>
      resolveStorageConfig({
        VENVIEWER_DEPLOY_ENV: "production",
        STORAGE_PROVIDER: "local",
      }),
    ).toThrow(/must be "r2"/);
  });

  it("resolves r2 configuration", () => {
    const config = resolveStorageConfig({
      VENVIEWER_DEPLOY_ENV: "staging",
      STORAGE_PROVIDER: "r2",
      R2_ACCOUNT_ID: "acct",
      R2_ACCESS_KEY_ID: "key",
      R2_SECRET_ACCESS_KEY: "secret",
      R2_BUCKET: "venviewer",
      R2_ENDPOINT: "https://example.r2.cloudflarestorage.com",
      R2_REGION: "auto",
    });
    expect(config.type).toBe("r2");
    expect(config.r2?.bucket).toBe("venviewer");
  });

  it("rejects unimplemented providers", () => {
    expect(() =>
      resolveStorageConfig({
        STORAGE_PROVIDER: "s3",
      }),
    ).toThrow(/not implemented/);
  });
});

describe("validateR2Config", () => {
  it("returns errors for missing fields", () => {
    const errors = validateR2Config({
      accountId: "",
      accessKeyId: "",
      secretAccessKey: "",
      bucket: "",
      endpoint: "",
      region: "auto",
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("resolveDeployEnvironment", () => {
  it("normalizes staging and production", () => {
    expect(resolveDeployEnvironment({ VENVIEWER_DEPLOY_ENV: "staging" })).toBe(
      "staging",
    );
    expect(
      resolveDeployEnvironment({ VENVIEWER_DEPLOY_ENV: "production" }),
    ).toBe("production");
    expect(resolveDeployEnvironment({})).toBe("development");
  });
});

describe("R2StorageProvider", () => {
  const r2Config = {
    accountId: "acct",
    accessKeyId: "key",
    secretAccessKey: "secret",
    bucket: "venviewer",
    endpoint: "https://example.r2.cloudflarestorage.com",
    region: "auto",
  };

  function createMockClient(
    handlers: Record<string, (input: unknown) => unknown>,
  ) {
    return {
      send: vi.fn(
        async (command: { constructor: { name: string }; input: unknown }) => {
          const handler = handlers[command.constructor.name];
          if (!handler)
            throw new Error(`Unexpected command: ${command.constructor.name}`);
          return handler(command.input);
        },
      ),
    } as never;
  }

  it("puts and gets objects", async () => {
    const store = new Map<string, Buffer>();
    const provider = new R2StorageProvider({
      config: r2Config,
      client: createMockClient({
        PutObjectCommand: (input) => {
          const typed = input as { Bucket: string; Key: string; Body: Buffer };
          store.set(`${typed.Bucket}/${typed.Key}`, Buffer.from(typed.Body));
          return {};
        },
        GetObjectCommand: (input) => {
          const typed = input as { Bucket: string; Key: string };
          return {
            Body: store.get(`${typed.Bucket}/${typed.Key}`),
            ContentType: "image/jpeg",
          };
        },
      }),
    });
    await provider.putObject({
      bucket: "venviewer",
      objectKey: "organizations/org_1/logo.png",
      body: Buffer.from("logo"),
      mimeType: "image/png",
    });

    const object = await provider.getObject(
      "venviewer",
      "organizations/org_1/logo.png",
    );
    expect(object.body.toString()).toBe("logo");
  });

  it("returns false when object is missing", async () => {
    const provider = new R2StorageProvider({
      config: r2Config,
      client: createMockClient({
        HeadObjectCommand: () => {
          const error = new Error("Not Found");
          error.name = "NoSuchKey";
          throw error;
        },
      }),
    });
    expect(await provider.objectExists("venviewer", "missing/key")).toBe(false);
  });

  it("deletes objects", async () => {
    const provider = new R2StorageProvider({
      config: r2Config,
      client: createMockClient({
        DeleteObjectCommand: () => ({}),
      }),
    });
    await expect(
      provider.deleteObject("venviewer", "key"),
    ).resolves.toBeUndefined();
  });

  it("normalizes missing object errors on get", async () => {
    const provider = new R2StorageProvider({
      config: r2Config,
      client: createMockClient({
        GetObjectCommand: () => {
          const error = new Error("NoSuchKey");
          error.name = "NoSuchKey";
          throw error;
        },
      }),
    });
    await expect(
      provider.getObject("venviewer", "missing"),
    ).rejects.toBeInstanceOf(StorageError);
  });
});
