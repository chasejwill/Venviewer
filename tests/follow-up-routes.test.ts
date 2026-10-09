import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetEnvCacheForTests } from "@/lib/env";
import { resetAppStorageForTests } from "@/lib/storage/app-config";

const {
  findUnique,
  findFirst,
  assetFindUnique,
  assetCreate,
  assetUpdate,
  assetDelete,
  eventCreate,
  eventFindFirst,
  analyticsUpsert,
  queryRaw,
  transaction,
  getSession,
  authorizeAdminForm,
  authorizeAdminHeader,
} = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  assetFindUnique: vi.fn(),
  assetCreate: vi.fn(),
  assetUpdate: vi.fn(),
  assetDelete: vi.fn(),
  eventCreate: vi.fn(),
  eventFindFirst: vi.fn(),
  analyticsUpsert: vi.fn(),
  queryRaw: vi.fn(),
  transaction: vi.fn(),
  getSession: vi.fn(),
  authorizeAdminForm: vi.fn(),
  authorizeAdminHeader: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    tour: { findUnique, findFirst },
    asset: {
      findUnique: assetFindUnique,
      create: assetCreate,
      update: assetUpdate,
      delete: assetDelete,
    },
    tourEvent: { create: eventCreate, findFirst: eventFindFirst },
    tourAnalytics: { upsert: analyticsUpsert },
    $queryRaw: queryRaw,
    $transaction: transaction,
  },
}));

vi.mock("@/lib/auth", () => ({
  getSession,
  authorizeAdminForm,
  authorizeAdminHeader,
  AdminAuthError: class AdminAuthError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

import { POST as postAnalytics } from "@/app/api/analytics/events/route";
import {
  GET as getDelivery,
  POST as postDelivery,
} from "@/app/api/assets/[id]/delivery/route";
import { POST as postArchive } from "@/app/api/assets/[id]/archive/route";
import { DELETE as deleteAsset } from "@/app/api/assets/[id]/delete/route";
import { POST as postUpload } from "@/app/api/tours/[id]/assets/upload/route";
import { GET as getHealth } from "@/app/api/health/route";
import { GET as getIntegration } from "@/app/api/integration/tours/[slug]/route";
import { resetAnalyticsRateLimitForTests } from "@/lib/analytics/rate-limit";
import { sha256Hex } from "@/lib/assets/checksum";
import {
  ingestPanorama,
  type AssetRepository,
  type StoredAssetRow,
} from "@/lib/assets/pipeline";
import { createStorageProvider } from "@/lib/storage/factory";

const secret = "route-test-session-secret-at-least-32-characters";
const deliverySecret = "delivery-test-secret-at-least-32-characters";

const publishedTour = {
  id: "tour_falls",
  title: "Falls",
  slug: "falls",
  provider: "legacy-kuula",
  kuulaUrl: "https://kuula.co/share/abc",
  published: true,
  embedPolicy: "venview_only",
  embedAllowedDomains: null,
  integrationEnabled: true,
  branding: null,
  primaryCtaLabel: "Book",
  primaryCtaUrl: "https://venview.co/book",
  secondaryCtaLabel: null,
  secondaryCtaUrl: null,
  showPoweredByVenview: true,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

function env() {
  process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/venviewer";
  process.env.VENVIEWER_LITE_BASE_URL = "https://viewer.example";
  process.env.VENVIEWER_LITE_ADMIN_EMAIL = "admin@viewer.example";
  process.env.VENVIEWER_LITE_ADMIN_PASSWORD_HASH =
    "$2b$04$pJN3Lr.cBFuTYl9hzXlCYunQ3PTa56wUMMAq8b5Im8qaYe2PW1O3i";
  process.env.VENVIEWER_LITE_SESSION_SECRET = secret;
  process.env.VENVIEWER_LITE_DEPLOY_ENV = "test";
  process.env.VENVIEWER_DELIVERY_SECRET = deliverySecret;
  process.env.STORAGE_PROVIDER = "local";
  delete process.env.R2_SECRET_ACCESS_KEY;
  resetEnvCacheForTests();
  resetAppStorageForTests();
  resetAnalyticsRateLimitForTests();
}

describe("analytics, integration, and health routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env();
    transaction.mockImplementation(async (ops: Promise<unknown>[]) => {
      await Promise.all(ops);
    });
  });

  it("records events only for published tours", async () => {
    findFirst.mockResolvedValue({ id: "tour_falls" });
    eventFindFirst.mockResolvedValue(null);
    const response = await postAnalytics(
      new Request("https://viewer.example/api/analytics/events", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          referer: "https://www.venview.co/listings/falls",
        },
        body: JSON.stringify({
          tourId: "tour_falls",
          type: "embed_load",
          surface: "embed",
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(eventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tourId: "tour_falls",
        type: "embed_load",
        surface: "embed",
        referrerDomain: "www.venview.co",
      }),
    });
    expect(analyticsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ embedViews: 1, views: 0 }),
      }),
    );
    const recorded = eventCreate.mock.calls[0][0].data.visitorKey as string;
    expect(recorded).toMatch(/^[a-f0-9]{32}$/);
    expect(recorded).not.toContain("venview");
  });

  it("does not record a draft or missing tour", async () => {
    findFirst.mockResolvedValue(null);
    const response = await postAnalytics(
      new Request("https://viewer.example/api/analytics/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tourId: "tour_draft", type: "tour_view" }),
      }),
    );
    expect(response.status).toBe(404);
    expect(eventCreate).not.toHaveBeenCalled();
  });

  it("builds the integration payload with the public /[slug] URL", async () => {
    findUnique.mockResolvedValue(publishedTour);
    const response = await getIntegration(
      new Request("https://viewer.example/api/integration/tours/falls"),
      { params: Promise.resolve({ slug: "falls" }) },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      venviewerTourId: "tour_falls",
      venviewerSlug: "falls",
      venviewerPublicViewerUrl: "https://viewer.example/falls",
      venviewerEmbedUrl: "https://viewer.example/embed/falls",
      tourEnabled: true,
      embedPolicy: "venview_only",
      provider: "kuula",
      status: "published",
      title: "Falls",
    });
    expect(body.venviewerPublicViewerUrl).not.toContain("/view/");
    expect(JSON.stringify(body)).not.toContain("kuula.co");
    expect(JSON.stringify(body)).not.toContain(secret);
  });

  it("reports database and storage status without secrets", async () => {
    queryRaw.mockResolvedValue([1]);
    process.env.R2_SECRET_ACCESS_KEY = "super-secret-r2-value";
    process.env.VENVIEWER_LITE_DEPLOY_ENV = "production";
    delete process.env.STORAGE_PROVIDER;
    resetEnvCacheForTests();
    resetAppStorageForTests();

    const response = await getHealth();
    const text = await response.text();
    expect(response.status).toBe(200);
    expect(JSON.parse(text)).toEqual({
      ok: true,
      database: "ok",
      storage: "not_configured",
    });
    expect(text).not.toContain("super-secret-r2-value");
    expect(text).not.toContain("R2_");
    expect(text).not.toContain(secret);
    process.env.VENVIEWER_LITE_DEPLOY_ENV = "test";
    process.env.STORAGE_PROVIDER = "local";
    delete process.env.R2_SECRET_ACCESS_KEY;
    resetEnvCacheForTests();
    resetAppStorageForTests();
  });
});

describe("asset routes", () => {
  let tempRoot = "";

  beforeEach(async () => {
    vi.clearAllMocks();
    env();
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "venviewer-assets-"));
    process.env.STORAGE_LOCAL_ROOT = tempRoot;
    process.env.STORAGE_BUCKET = "test-bucket";
    resetAppStorageForTests();
    authorizeAdminForm.mockResolvedValue({ email: "admin@viewer.example" });
    authorizeAdminHeader.mockResolvedValue({ email: "admin@viewer.example" });
    getSession.mockResolvedValue(null);
  });

  afterEach(async () => {
    resetAppStorageForTests();
    if (tempRoot) await rm(tempRoot, { recursive: true, force: true });
  });

  it("rejects an upload without an admin session", async () => {
    const { AdminAuthError } = await import("@/lib/auth");
    authorizeAdminForm.mockRejectedValue(
      new AdminAuthError("Authentication required.", 401),
    );
    const form = new FormData();
    form.set("csrf", "token");
    const response = await postUpload(
      new Request("https://viewer.example/api/tours/tour_falls/assets/upload", {
        method: "POST",
        body: form,
      }),
      { params: Promise.resolve({ id: "tour_falls" }) },
    );
    expect(response.status).toBe(401);
    expect(assetCreate).not.toHaveBeenCalled();
  });

  it("fails the upload in production when R2 is not configured", async () => {
    process.env.VENVIEWER_LITE_DEPLOY_ENV = "production";
    delete process.env.STORAGE_PROVIDER;
    resetEnvCacheForTests();
    resetAppStorageForTests();
    findUnique.mockResolvedValue({ id: "tour_falls" });
    const form = new FormData();
    form.set(
      "file",
      new File([Uint8Array.from([1, 2, 3])], "lobby.jpg", {
        type: "image/jpeg",
      }),
    );
    const response = await postUpload(
      new Request("https://viewer.example/api/tours/tour_falls/assets/upload", {
        method: "POST",
        body: form,
      }),
      { params: Promise.resolve({ id: "tour_falls" }) },
    );
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toMatch(/r2/i);
    expect(JSON.stringify(body)).not.toContain("secret");
    expect(assetCreate).not.toHaveBeenCalled();
  });

  it("stores a panorama locally and blocks delivery after archive", async () => {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    const provider = createStorageProvider({
      type: "local",
      localRootPath: tempRoot,
      defaultBucket: "test-bucket",
    });
    const rows = new Map<string, StoredAssetRow>();
    const repository: AssetRepository = {
      async createProcessing(input) {
        const row: StoredAssetRow = {
          ...input,
          type: "panorama",
          processingStatus: "processing",
          lifecycleStatus: "active",
          visibility: "private",
          processingError: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          variants: [],
        };
        rows.set(input.id, row);
        return row;
      },
      async markReady(id, variants) {
        const row = rows.get(id);
        if (!row) throw new Error("missing");
        row.processingStatus = "ready";
        row.variants = variants.map((variant, index) => ({
          ...variant,
          id: `var_${index}`,
          assetId: id,
          createdAt: new Date(),
        }));
        return row;
      },
      async markFailed() {
        throw new Error("unexpected failure");
      },
    };

    const ingested = await ingestPanorama({
      tourId: "tour_falls",
      filename: "lobby.png",
      bytes: png,
      maxByteSize: 1024 * 1024,
      provider,
      repository,
    });
    expect(ingested.ok).toBe(true);
    if (!ingested.ok) return;
    expect(ingested.asset.checksum).toBe(sha256Hex(png));
    expect(
      ingested.asset.variants.map((variant) => variant.variant).sort(),
    ).toEqual(["preview", "thumbnail"]);
    expect(ingested.asset.objectKey).toContain(
      "organizations/venviewer/tours/tour_falls/",
    );
    expect(
      await provider.objectExists(
        ingested.asset.bucket,
        ingested.asset.objectKey,
      ),
    ).toBe(true);

    assetFindUnique.mockResolvedValue({
      ...ingested.asset,
      variants: ingested.asset.variants,
    });
    getSession.mockResolvedValue({ email: "admin@viewer.example" });
    const open = await getDelivery(
      new Request(
        `https://viewer.example/api/assets/${ingested.asset.id}/delivery?variant=thumbnail`,
      ),
      { params: Promise.resolve({ id: ingested.asset.id }) },
    );
    expect(open.status).toBe(200);
    expect(open.headers.get("content-type")).toBe("image/jpeg");
    expect(open.headers.get("cache-control")).toContain("private");

    assetUpdate.mockResolvedValue({});
    const archived = await postArchive(
      new Request(
        `https://viewer.example/api/assets/${ingested.asset.id}/archive`,
        {
          method: "POST",
          body: new FormData(),
        },
      ),
      { params: Promise.resolve({ id: ingested.asset.id }) },
    );
    expect(archived.status).toBe(200);
    expect(assetUpdate).toHaveBeenCalledWith({
      where: { id: ingested.asset.id },
      data: { lifecycleStatus: "archived" },
    });

    assetFindUnique.mockResolvedValue({
      ...ingested.asset,
      lifecycleStatus: "archived",
    });
    const blocked = await getDelivery(
      new Request(
        `https://viewer.example/api/assets/${ingested.asset.id}/delivery?variant=original`,
      ),
      { params: Promise.resolve({ id: ingested.asset.id }) },
    );
    expect(blocked.status).toBe(404);
  });

  it("deletes stored objects and the asset row", async () => {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    process.env.STORAGE_LOCAL_ROOT = tempRoot;
    resetAppStorageForTests();
    const provider = createStorageProvider({
      type: "local",
      localRootPath: tempRoot,
      defaultBucket: "test-bucket",
    });
    await provider.putObject({
      bucket: "test-bucket",
      objectKey: "organizations/venviewer/original.png",
      body: png,
      mimeType: "image/png",
    });
    assetFindUnique.mockResolvedValue({
      id: "asset_1",
      tourId: "tour_falls",
      bucket: "test-bucket",
      objectKey: "organizations/venviewer/original.png",
      variants: [],
    });
    assetDelete.mockResolvedValue({});
    const response = await deleteAsset(
      new Request("https://viewer.example/api/assets/asset_1/delete", {
        method: "DELETE",
        headers: {
          origin: "https://viewer.example",
          "x-csrf-token": "token",
        },
      }),
      { params: Promise.resolve({ id: "asset_1" }) },
    );
    expect(response.status).toBe(200);
    expect(assetDelete).toHaveBeenCalledWith({ where: { id: "asset_1" } });
    expect(
      await provider.objectExists(
        "test-bucket",
        "organizations/venviewer/original.png",
      ),
    ).toBe(false);
  });

  it("refuses delivery without a session or token", async () => {
    const response = await getDelivery(
      new Request(
        "https://viewer.example/api/assets/asset_1/delivery?variant=preview",
      ),
      { params: Promise.resolve({ id: "asset_1" }) },
    );
    expect(response.status).toBe(401);
    expect(assetFindUnique).not.toHaveBeenCalled();
  });

  it("mints a private delivery token for an admin", async () => {
    assetFindUnique.mockResolvedValue({
      id: "asset_1",
      lifecycleStatus: "active",
      processingStatus: "ready",
      variants: [{ variant: "preview" }],
    });
    const response = await postDelivery(
      new Request(
        "https://viewer.example/api/assets/asset_1/delivery?variant=preview",
        {
          method: "POST",
          headers: {
            origin: "https://viewer.example",
            "x-csrf-token": "token",
          },
        },
      ),
      { params: Promise.resolve({ id: "asset_1" }) },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.expiresInSeconds).toBe(900);
    expect(body.deliveryPath).toContain(
      "/api/assets/asset_1/delivery?variant=preview&token=",
    );
    expect(body.deliveryPath).not.toContain("http");
  });
});
