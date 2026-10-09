import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetEnvCacheForTests } from "@/lib/env";

const { findUnique, notFound } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/db", () => ({ db: { tour: { findUnique } } }));
vi.mock("next/navigation", () => ({ notFound }));

import PublicTourPage, {
  generateMetadata as generatePublicMetadata,
} from "@/app/[slug]/page";
import EmbedTourPage, {
  generateMetadata as generateEmbedMetadata,
} from "@/app/embed/[slug]/page";

const tour = {
  id: "tour_falls",
  title:
    "Falls of the Ohio State Park and Interpretive Center Virtual Tour Experience",
  slug: "falls",
  provider: "legacy-kuula",
  kuulaUrl: "https://kuula.co/share/abc?mode=1&foo=two",
  published: true,
  defaultSceneId: null,
  scenes: [],
  connections: [],
};

const nativeTour = {
  id: "tour_lobby",
  title: "Lobby",
  slug: "lobby",
  provider: "venviewer-native",
  kuulaUrl: null,
  published: true,
  defaultSceneId: "scene_lobby",
  scenes: [
    {
      id: "scene_lobby",
      title: "Lobby",
      panoramaAssetId: "/panoramas/lobby.jpg",
      thumbnailAssetId: null,
      defaultYaw: 0,
      defaultPitch: 0,
      defaultFov: 75,
      floor: "1",
      sortOrder: 0,
      positionX: null,
      positionY: null,
      positionZ: null,
    },
  ],
  connections: [],
};

function markup(node: Awaited<ReturnType<typeof PublicTourPage>>) {
  return renderToStaticMarkup(createElement(() => node));
}

describe("public and embed routes", () => {
  beforeEach(() => {
    findUnique.mockReset();
    notFound.mockClear();
    process.env.DATABASE_URL =
      "postgresql://user:pass@localhost:5432/venviewer";
    process.env.VENVIEWER_LITE_BASE_URL = "https://viewer.example";
    process.env.VENVIEWER_LITE_ADMIN_EMAIL = "admin@viewer.example";
    process.env.VENVIEWER_LITE_ADMIN_PASSWORD_HASH =
      "$2b$04$pJN3Lr.cBFuTYl9hzXlCYunQ3PTa56wUMMAq8b5Im8qaYe2PW1O3i";
    process.env.VENVIEWER_LITE_SESSION_SECRET =
      "route-test-session-secret-at-least-32-characters";
    process.env.VENVIEWER_LITE_DEPLOY_ENV = "test";
    resetEnvCacheForTests();
  });

  it("renders exactly one centered public title header and the Kuula viewer", async () => {
    findUnique.mockResolvedValue(tour);
    const result = await PublicTourPage({
      params: Promise.resolve({ slug: "falls" }),
    });
    const html = markup(result);

    expect(findUnique).toHaveBeenCalledWith({
      where: { slug: "falls" },
      include: {
        scenes: { orderBy: { sortOrder: "asc" } },
        connections: true,
      },
    });
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1);
    expect(html).toContain('class="public-title-header"');
    expect(html).toContain(tour.title);
    expect(html).toContain("https://kuula.co/share/abc?mode=1&amp;foo=two");
    expect(html).toContain('allow="fullscreen; xr-spatial-tracking"');
    expect(html).not.toContain("viewer-title");
    expect(html).not.toContain("card");
  });

  it("keeps the embed route minimal and free of the public header", async () => {
    findUnique.mockResolvedValue(tour);
    const result = await EmbedTourPage({
      params: Promise.resolve({ slug: "falls" }),
    });
    const html = renderToStaticMarkup(createElement(() => result));

    expect(html).toContain('class="embed-page"');
    expect(html).toContain("https://kuula.co/share/abc?mode=1&amp;foo=two");
    expect(html).not.toContain("<h1");
    expect(html).not.toContain("public-title-header");
  });

  it.each([
    ["public", PublicTourPage],
    ["embed", EmbedTourPage],
  ])("calls notFound for an unknown %s tour", async (_name, Page) => {
    findUnique.mockResolvedValue(null);
    await expect(
      Page({ params: Promise.resolve({ slug: "missing" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it.each([
    ["public", generatePublicMetadata],
    ["embed", generateEmbedMetadata],
  ])(
    "resolves unknown %s metadata through notFound before rendering",
    async (_name, metadata) => {
      findUnique.mockResolvedValue(null);
      await expect(
        metadata({ params: Promise.resolve({ slug: "missing" }) }),
      ).rejects.toThrow("NEXT_NOT_FOUND");
      expect(notFound).toHaveBeenCalled();
    },
  );

  it.each([
    ["public", generatePublicMetadata],
    ["embed", generateEmbedMetadata],
  ])(
    "preserves metadata for an unpublished %s tour",
    async (_name, metadata) => {
      findUnique.mockResolvedValue({ ...tour, published: false });
      await expect(
        metadata({ params: Promise.resolve({ slug: "draft" }) }),
      ).resolves.toMatchObject({ title: tour.title });
      expect(notFound).not.toHaveBeenCalled();
    },
  );

  it("adds canonical public metadata and a useful published description", async () => {
    findUnique.mockResolvedValue(tour);
    await expect(
      generatePublicMetadata({
        params: Promise.resolve({ slug: "falls" }),
      }),
    ).resolves.toEqual({
      title: tour.title,
      description: `Explore ${tour.title} in an interactive virtual tour.`,
      alternates: { canonical: new URL("https://viewer.example/falls") },
      robots: undefined,
    });
  });

  it("renders the public draft with its title header, no fake player, and noindex metadata", async () => {
    findUnique.mockResolvedValue({ ...tour, published: false });
    const result = await PublicTourPage({
      params: Promise.resolve({ slug: "draft" }),
    });
    const html = markup(result);

    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1);
    expect(html).toContain('class="public-title-header"');
    expect(html).toContain("This tour is not currently available.");
    expect(html).not.toContain("<iframe");
    await expect(
      generatePublicMetadata({
        params: Promise.resolve({ slug: "draft" }),
      }),
    ).resolves.toMatchObject({
      alternates: { canonical: new URL("https://viewer.example/draft") },
      robots: { index: false, follow: false },
    });
  });

  it("renders an embed draft without an iframe or public presentation", async () => {
    findUnique.mockResolvedValue({ ...tour, published: false });
    const result = await EmbedTourPage({
      params: Promise.resolve({ slug: "draft" }),
    });
    const html = renderToStaticMarkup(createElement(() => result));
    expect(html).toContain("unpublished");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("public-title-header");
  });

  it("renders a published native tour without a Kuula frame or provider URL", async () => {
    findUnique.mockResolvedValue(nativeTour);
    const result = await PublicTourPage({
      params: Promise.resolve({ slug: "lobby" }),
    });
    const html = markup(result);

    expect(html).toContain('data-provider="venviewer-native"');
    expect(html).toContain("Loading view");
    expect(html).toContain("Enter fullscreen");
    expect(html).toContain(nativeTour.title);
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("kuula.co");
    expect(html).not.toContain("public-title-header");
  });

  it("renders a native embed with the same runtime and no public header", async () => {
    findUnique.mockResolvedValue(nativeTour);
    const result = await EmbedTourPage({
      params: Promise.resolve({ slug: "lobby" }),
    });
    const html = renderToStaticMarkup(createElement(() => result));

    expect(html).toContain('class="embed-page"');
    expect(html).toContain('data-provider="venviewer-native"');
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("public-title-header");
    expect(html).not.toContain("<h1");
  });

  it("defines the gradient, viewport layout, long-title wrapping, and no concealment effects", () => {
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toContain("--venview-racing-yellow: #ffd400");
    expect(css).toContain("--venview-deep-sunset-orange: #e85d04");
    expect(css).toMatch(
      /linear-gradient\(\s*135deg,\s*var\(--venview-racing-yellow\),\s*var\(--venview-deep-sunset-orange\)\s*\)/,
    );
    expect(css).toContain("grid-template-rows: auto minmax(0, 1fr)");
    expect(css).toContain("height: 100dvh");
    expect(css).toContain("overflow-wrap: anywhere");
    expect(css).not.toMatch(/\b(?:mask|clip-path|filter|backdrop-filter)\s*:/);
  });
});
