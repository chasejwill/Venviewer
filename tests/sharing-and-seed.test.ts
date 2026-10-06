import { describe, expect, it } from "vitest";
import { tourSharing } from "@/lib/sharing";
import { FALLS_OF_THE_OHIO } from "@/prisma/seed-data";

describe("sharing output and development seed", () => {
  it("generates consistent URLs and the required iframe attributes", () => {
    const sharing = tourSharing("https://viewer.example", {
      slug: "falls",
      title: 'Falls "Tour"',
    });

    expect(sharing.publicUrl).toBe("https://viewer.example/falls");
    expect(sharing.embedUrl).toBe("https://viewer.example/embed/falls");
    expect(sharing.iframeCode).toBe(
      '<iframe src="https://viewer.example/embed/falls" width="100%" height="640" title="Falls &quot;Tour&quot;" allow="fullscreen; xr-spatial-tracking" allowfullscreen loading="lazy"></iframe>',
    );
  });

  it("uses the required Falls of the Ohio draft URL", () => {
    expect(FALLS_OF_THE_OHIO).toEqual({
      title: "Falls of the Ohio",
      slug: "falls-of-the-ohio",
      provider: "legacy-kuula",
      kuulaUrl:
        "https://kuula.co/share/collection/7Tnsc?logo=0&info=0&fs=1&vr=1&sd=1&initload=0&thumbs=1",
      published: false,
    });
  });
});
