import { describe, expect, it } from "vitest";
import type { Tour } from "@/lib/embed/tour-types";
import {
  buildVenviewerIntegrationPayload,
  generateEmbedCode,
  normalizeEmbedAllowedDomains,
  normalizeEmbedPolicy,
} from "@/lib/integration/tour-service";

const baseTour: Tour = {
  id: "tour_1",
  organizationId: "org_1",
  title: "Sample Tour",
  slug: "sample-tour",
  description: null,
  provider: "kuula",
  providerTourId: "collection/abc",
  providerEmbedUrl: "https://kuula.co/share/collection/abc",
  providerMetadata: null,
  status: "published",
  publicViewerUrl: "https://tour.venview.co/sample-tour",
  embedUrl: "https://tour.venview.co/embed/sample-tour",
  primaryCtaLabel: null,
  primaryCtaUrl: null,
  secondaryCtaLabel: null,
  secondaryCtaUrl: null,
  showPoweredByVenview: true,
  branding: null,
  embedPolicy: "venview_only",
  embedAllowedDomains: ["venview.co"],
  integrationEnabled: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  publishedAt: "2026-01-01T00:00:00.000Z",
  archivedAt: null,
};

describe("generateEmbedCode", () => {
  it("includes fullscreen attributes", () => {
    const code = generateEmbedCode("https://example.com/embed/demo");
    expect(code).toContain('allow="fullscreen"');
    expect(code).toContain("allowfullscreen");
    expect(code).toContain("padding-bottom:56.25%");
  });

  it("can emit a fixed-size iframe", () => {
    const code = generateEmbedCode("https://example.com/embed/demo", {
      responsive: false,
      lazy: false,
    });
    expect(code).toContain('width="100%"');
    expect(code).toContain('height="600"');
    expect(code).toContain('loading="eager"');
  });
});

describe("embed policy normalization", () => {
  it("keeps known policies and defaults the rest to any", () => {
    expect(normalizeEmbedPolicy("disabled")).toBe("disabled");
    expect(normalizeEmbedPolicy("venview_only")).toBe("venview_only");
    expect(normalizeEmbedPolicy(undefined)).toBe("any");
  });

  it("normalizes and dedupes allowed domains", () => {
    expect(
      normalizeEmbedAllowedDomains([
        "https://Venview.co/listings",
        "venview.co",
        " www.venview.co ",
      ]),
    ).toEqual(["venview.co", "www.venview.co"]);
  });
});

describe("buildVenviewerIntegrationPayload", () => {
  it("enables a published tour for Venview listings", () => {
    expect(buildVenviewerIntegrationPayload(baseTour)).toMatchObject({
      venviewerTourId: "tour_1",
      venviewerSlug: "sample-tour",
      venviewerEmbedUrl: "https://tour.venview.co/embed/sample-tour",
      venviewerPublicViewerUrl: "https://tour.venview.co/sample-tour",
      tourEnabled: true,
      embedPolicy: "venview_only",
      provider: "kuula",
      title: "Sample Tour",
      status: "published",
    });
  });

  it("disables drafts, turned-off integration, and disabled embeds", () => {
    expect(
      buildVenviewerIntegrationPayload({ ...baseTour, status: "draft" })
        .tourEnabled,
    ).toBe(false);
    expect(
      buildVenviewerIntegrationPayload({
        ...baseTour,
        integrationEnabled: false,
      }).tourEnabled,
    ).toBe(false);
    expect(
      buildVenviewerIntegrationPayload({
        ...baseTour,
        embedPolicy: "disabled",
      }).tourEnabled,
    ).toBe(false);
  });
});
