import { describe, expect, it } from "vitest";
import {
  assertOrganizationAccess,
  buildAssetObjectKey,
  validatePanoramaUpload,
} from "@/lib/assets/validation";
import {
  createDeliveryToken,
  verifyDeliveryToken,
} from "@/lib/assets/delivery-token";
import {
  ASSET_CHECKSUM_ALGORITHM,
  describeChecksumAlgorithm,
} from "@/lib/assets/checksum";

describe("validatePanoramaUpload", () => {
  it("accepts valid panorama uploads", () => {
    const result = validatePanoramaUpload({
      filename: "lobby.jpg",
      mimeType: "image/jpeg",
      byteSize: 1024,
      width: 6000,
      height: 3000,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects unsupported mime types", () => {
    const result = validatePanoramaUpload({
      filename: "lobby.gif",
      mimeType: "image/gif",
      byteSize: 1024,
      width: 1000,
      height: 500,
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Unsupported file type");
  });

  it("rejects oversized files", () => {
    const result = validatePanoramaUpload(
      {
        filename: "lobby.jpg",
        mimeType: "image/jpeg",
        byteSize: 100,
        width: 1000,
        height: 500,
      },
      { maxByteSize: 50 },
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("maximum size");
  });
});

describe("buildAssetObjectKey", () => {
  it("builds organization/tour/asset hierarchy", () => {
    expect(
      buildAssetObjectKey({
        organizationId: "org_1",
        tourId: "tour_1",
        assetId: "asset_1",
        variant: "original",
        filename: "main-floor.jpg",
      }),
    ).toBe(
      "organizations/org_1/tours/tour_1/assets/asset_1/original/main-floor.jpg",
    );
  });
});

describe("assertOrganizationAccess", () => {
  it("allows matching organization", () => {
    expect(assertOrganizationAccess("org_a", "org_a")).toBe(true);
  });

  it("denies cross-organization access", () => {
    expect(assertOrganizationAccess("org_a", "org_b")).toBe(false);
  });
});

describe("checksum", () => {
  it("documents sha256 algorithm", () => {
    expect(ASSET_CHECKSUM_ALGORITHM).toBe("sha256");
    expect(describeChecksumAlgorithm()).toContain("SHA-256");
  });
});

describe("delivery tokens", () => {
  const basePayload = {
    assetId: "asset_1",
    variant: "thumbnail" as const,
    organizationId: "org_1",
    purpose: "management" as const,
  };

  it("creates and verifies signed delivery tokens", () => {
    const token = createDeliveryToken(
      { ...basePayload, expiresAt: Date.now() + 60_000 },
      "secret",
    );

    const payload = verifyDeliveryToken(token, "secret");
    expect(payload?.assetId).toBe("asset_1");
    expect(payload?.variant).toBe("thumbnail");
    expect(payload?.purpose).toBe("management");
  });

  it("rejects expired tokens", () => {
    const token = createDeliveryToken(
      { ...basePayload, expiresAt: Date.now() - 1 },
      "secret",
    );
    expect(verifyDeliveryToken(token, "secret")).toBeNull();
  });

  it("rejects altered tokens", () => {
    const token = createDeliveryToken(
      { ...basePayload, expiresAt: Date.now() + 60_000 },
      "secret",
    );
    const [body] = token.split(".");
    expect(verifyDeliveryToken(`${body}.tampered`, "secret")).toBeNull();
  });

  it("rejects wrong secret", () => {
    const token = createDeliveryToken(
      { ...basePayload, expiresAt: Date.now() + 60_000 },
      "secret",
    );
    expect(verifyDeliveryToken(token, "other-secret")).toBeNull();
  });
});
