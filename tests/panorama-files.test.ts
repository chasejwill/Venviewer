import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  panoramaContentType,
  resolvePanoramaFile,
} from "@/lib/providers/panorama-files";

describe("panorama file delivery", () => {
  const root = path.join("/tmp", "venviewer-panoramas");

  it("resolves a same-origin asset inside the storage root", () => {
    expect(resolvePanoramaFile("/panoramas/lobby.jpg", root)).toBe(
      path.join(root, "lobby.jpg"),
    );
    expect(resolvePanoramaFile("/panoramas/floor-1/hall.webp", root)).toBe(
      path.join(root, "floor-1", "hall.webp"),
    );
    expect(panoramaContentType("/panoramas/lobby.png")).toBe("image/png");
  });

  it("rejects provider URLs and paths that leave the storage root", () => {
    expect(resolvePanoramaFile("https://kuula.co/share/abc", root)).toBeNull();
    expect(resolvePanoramaFile("/panoramas/../secret.jpg", root)).toBeNull();
    expect(
      resolvePanoramaFile("/panoramas/lobby.jpg/../../etc/passwd", root),
    ).toBeNull();
  });
});
