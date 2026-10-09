import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  frameAncestorsForTour,
  isTourEmbeddable,
  readStoredEmbedPolicy,
} from "@/lib/embed/enforce";

const { findUnique, headerGet } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  headerGet: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: { tour: { findUnique } } }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("next/headers", () => ({
  headers: async () => ({ get: headerGet }),
}));

import EmbedTourPage from "@/app/embed/[slug]/page";

const tour = {
  id: "tour_falls",
  title: "Falls",
  slug: "falls",
  provider: "legacy-kuula",
  kuulaUrl: "https://kuula.co/share/abc",
  published: true,
  defaultSceneId: null,
  scenes: [],
  connections: [],
  embedPolicy: "venview_only",
  embedAllowedDomains: null,
};

describe("embed enforcement", () => {
  beforeEach(() => {
    findUnique.mockReset();
    headerGet.mockReset();
  });

  it("treats a missing stored policy as any and an unknown value as disabled", () => {
    expect(readStoredEmbedPolicy(undefined)).toBe("any");
    expect(readStoredEmbedPolicy("nope")).toBe("disabled");
  });

  it("keeps an any-policy tour embeddable from an unknown host", () => {
    expect(
      isTourEmbeddable(
        { embedPolicy: "any", embedAllowedDomains: null },
        "https://customer.example/page",
      ),
    ).toBe(true);
  });

  it("blocks a venview_only tour framed from another site", async () => {
    findUnique.mockResolvedValue(tour);
    headerGet.mockImplementation((name: string) =>
      name === "referer" ? "https://customer.example/embed" : null,
    );
    const result = await EmbedTourPage({
      params: Promise.resolve({ slug: "falls" }),
    });
    const html = renderToStaticMarkup(createElement(() => result));
    expect(html).toContain("Embedding is not allowed");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("kuula.co");
  });

  it("renders a venview_only tour for a Venview referrer", async () => {
    findUnique.mockResolvedValue(tour);
    headerGet.mockImplementation((name: string) =>
      name === "referer" ? "https://www.venview.co/listings/falls" : null,
    );
    const result = await EmbedTourPage({
      params: Promise.resolve({ slug: "falls" }),
    });
    const html = renderToStaticMarkup(createElement(() => result));
    expect(html).toContain('class="embed-page"');
    expect(html).toContain("kuula.co/share/abc");
    expect(html).not.toContain("Embedding is not allowed");
  });

  it("builds frame-ancestors for venview hosts and not the retired dashboard host", () => {
    const directive = frameAncestorsForTour(
      { embedPolicy: "venview_only", embedAllowedDomains: null },
      "https://viewer.example",
    );
    expect(directive).toContain("https://venview.co");
    expect(directive).toContain("https://tour.venview.co");
    expect(directive).not.toContain("os.venview.co");
    expect(directive).not.toBe("*");
  });
});

describe("additive migration", () => {
  it("keeps existing rows embeddable and does not drop tour data", () => {
    const sql = readFileSync(
      "prisma/migrations/20261009180000_assets_analytics_embed/migration.sql",
      "utf8",
    );
    expect(sql).toContain("DEFAULT 'venview_only'");
    expect(sql).toContain("SET \"embedPolicy\" = 'any'");
    expect(sql).toContain('CREATE TABLE "Asset"');
    expect(sql).toContain('CREATE TABLE "AssetVariant"');
    expect(sql).toContain('CREATE TABLE "TourAnalytics"');
    expect(sql).toContain('CREATE TABLE "TourEvent"');
    expect(sql).not.toMatch(/DROP TABLE/i);
    expect(sql).not.toMatch(/Organization/);
    expect(sql).not.toMatch(/"User"/);
  });
});
