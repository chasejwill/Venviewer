import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TourViewer } from "@/components/TourViewer";
import {
  VIEWER_CONTROL_MIN_SIZE,
  VIEWER_TOKEN_NAMES,
} from "@/lib/viewer/tokens";

describe("tour viewer", () => {
  it("keeps the legacy Kuula frame behind the shared viewer", () => {
    const html = renderToStaticMarkup(
      createElement(TourViewer, {
        surface: "public",
        presentation: {
          ok: true,
          provider: "legacy-kuula",
          title: "Example tour",
          embedUrl: "https://kuula.co/share/abc",
        },
      }),
    );

    expect(html).toContain('data-provider="legacy-kuula"');
    expect(html).toContain("Loading virtual tour…");
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('width="100%"');
    expect(html).toContain('height="100%"');
    expect(html).not.toContain('height="640"');
    expect(html).toContain('class="viewer"');
    expect(html).toContain('allow="fullscreen; xr-spatial-tracking"');
    expect(html).toContain('loading="lazy"');
    expect(html.toLowerCase()).toContain("allowfullscreen");
    expect(html).not.toContain("viewer-canvas");
  });

  it("renders a native scene through the shared shell instead of an iframe", () => {
    const html = renderToStaticMarkup(
      createElement(TourViewer, {
        surface: "embed",
        presentation: {
          ok: true,
          provider: "venviewer-native",
          title: "Lobby",
          initialSceneId: "scene_lobby",
          scenes: [
            {
              id: "scene_lobby",
              title: "Lobby",
              textureUrl: "/panoramas/lobby.jpg",
              yaw: 0,
              pitch: 0,
              fov: 75,
            },
          ],
        },
      }),
    );

    expect(html).toContain('data-provider="venviewer-native"');
    expect(html).toContain('data-scene-id="scene_lobby"');
    expect(html).toContain("Loading view");
    expect(html).toContain('role="status"');
    expect(html).toContain("Enter fullscreen");
    expect(html).toContain("viewer-canvas");
    expect(html).toContain("arrow keys");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("kuula.co");
    expect(html).not.toContain("<h1");
  });
});

describe("viewer design tokens", () => {
  it("defines the shared token contract in the stylesheet", () => {
    const css = readFileSync("app/globals.css", "utf8");
    for (const token of VIEWER_TOKEN_NAMES) {
      expect(css).toContain(token);
    }
    expect(css).toContain(`--vv-control-size: ${VIEWER_CONTROL_MIN_SIZE}`);
    expect(css).toContain("min-height: var(--vv-control-size)");
    expect(css).toContain("prefers-reduced-motion");
  });
});
