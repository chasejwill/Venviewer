import { describe, expect, it } from "vitest";
import {
  CameraRig,
  fovDeltaFromPinch,
  fovDeltaFromWheel,
  lookDeltaFromDrag,
  normalizeRadians,
  shortestAngleDelta,
} from "@/lib/panorama/camera";
import { readResponseBlob } from "@/lib/panorama/load-image";
import { projectEquirectangular } from "@/lib/panorama/projection";
import {
  PANORAMA_TEXTURE_CACHE_LIMIT,
  PanoramaSession,
  type PanoramaBackend,
  type TextureResource,
} from "@/lib/panorama/session";

describe("panorama camera", () => {
  it("wraps yaw across the seam and clamps pitch and zoom", () => {
    expect(normalizeRadians(0)).toBeCloseTo(0);
    expect(shortestAngleDelta(3, -3)).toBeCloseTo(Math.PI * 2 - 6);
    const rig = new CameraRig({ yaw: 0, pitch: 0, fov: 75 });
    rig.applyUserLook(0, 4);
    rig.applyUserZoom(-100);
    expect(rig.state.pitch).toBeLessThan(1.5);
    expect(rig.state.pitch).toBeGreaterThan(1.4);
    expect(rig.state.fov).toBe(35);
  });

  it("interpolates toward a target and lets the visitor interrupt it", () => {
    const rig = new CameraRig({ yaw: 0, pitch: 0, fov: 75 });
    rig.lookToward({ yaw: 1.2, pitch: 0.4 });
    expect(rig.isAutomated).toBe(true);
    rig.tick(0.05, false);
    expect(rig.state.yaw).toBeGreaterThan(0);
    expect(rig.state.yaw).toBeLessThan(1.2);

    const reduced = new CameraRig({ yaw: 0, pitch: 0, fov: 75 });
    reduced.lookToward({ yaw: 1.2 });
    reduced.tick(0.05, true);
    expect(Math.abs(1.2 - reduced.state.yaw)).toBeLessThan(
      Math.abs(1.2 - rig.state.yaw),
    );

    rig.interrupt();
    const held = rig.state.yaw;
    expect(rig.isAutomated).toBe(false);
    rig.tick(1, false);
    expect(rig.state.yaw).toBeCloseTo(held);

    const dragging = new CameraRig({ yaw: 0, pitch: 0, fov: 80 });
    dragging.lookToward({ yaw: 1 });
    dragging.applyUserLook(0.2, -0.1);
    expect(dragging.isAutomated).toBe(false);
    expect(dragging.state.yaw).toBeCloseTo(0.2);
  });

  it("maps pointer, wheel, and pinch movement into camera deltas", () => {
    const drag = lookDeltaFromDrag(100, -50, 90, 200);
    expect(drag.yaw).toBeLessThan(0);
    expect(drag.pitch).toBeGreaterThan(0);
    expect(fovDeltaFromWheel(100)).toBeGreaterThan(0);
    expect(fovDeltaFromPinch(100, 150)).toBeLessThan(0);
    expect(fovDeltaFromPinch(0, 10)).toBe(0);
  });
});

describe("equirectangular projection", () => {
  it("centers yaw 0 on the panorama and looks right as yaw increases", () => {
    const center = projectEquirectangular(0, 0, 75, 1, 0, 0);
    expect(center.u).toBeCloseTo(0.5);
    expect(center.v).toBeCloseTo(0.5);

    const right = projectEquirectangular(Math.PI / 2, 0, 75, 1, 0, 0);
    expect(right.u).toBeCloseTo(0.75);
    expect(right.v).toBeCloseTo(0.5);

    const up = projectEquirectangular(0, 0.4, 75, 1, 0, 0);
    expect(up.v).toBeGreaterThan(0.5);
  });
});

describe("panorama session", () => {
  function backend() {
    const disposed: string[] = [];
    const pending = new Map<string, () => void>();
    const impl: PanoramaBackend = {
      async load(url): Promise<TextureResource> {
        const gate = pending.get(url);
        if (gate)
          await new Promise<void>((resolve) => pending.set(url, resolve));
        if (url.startsWith("fail:")) throw new Error("fail");
        return {
          id: url,
          url,
          dispose: () => disposed.push(url),
        };
      },
      draw() {},
      dispose() {},
    };
    return { impl, disposed, pending };
  }

  it("disposes textures that fall outside the preload cache", async () => {
    const gpu = backend();
    const session = new PanoramaSession(gpu.impl, {
      yaw: 0,
      pitch: 0,
      fov: 75,
    });
    const urls = Array.from(
      { length: PANORAMA_TEXTURE_CACHE_LIMIT + 1 },
      (_, index) => `/panoramas/scene-${index}.jpg`,
    );
    for (const url of urls) {
      await session.show({ url, camera: { yaw: 0, pitch: 0, fov: 70 } });
    }
    expect(session.residentTextureCount).toBe(PANORAMA_TEXTURE_CACHE_LIMIT);
    expect(gpu.disposed).toContain(urls[0]);
    expect(gpu.disposed).not.toContain(urls.at(-1));
    session.dispose();
    expect(gpu.disposed).toEqual(expect.arrayContaining(urls));
  });

  it("keeps an interrupted load from replacing a newer scene", async () => {
    const gpu = backend();
    let releaseSlow: (() => void) | undefined;
    gpu.pending.set("/panoramas/slow.jpg", () => releaseSlow?.());
    const originalLoad = gpu.impl.load.bind(gpu.impl);
    gpu.impl.load = (url, onProgress) => {
      if (url === "/panoramas/slow.jpg") {
        return new Promise((resolve) => {
          releaseSlow = () => {
            resolve({
              id: url,
              url,
              dispose: () => gpu.disposed.push(url),
            });
          };
        });
      }
      return originalLoad(url, onProgress);
    };
    const session = new PanoramaSession(gpu.impl, {
      yaw: 0,
      pitch: 0,
      fov: 75,
    });
    const slow = session.show({
      url: "/panoramas/slow.jpg",
      camera: { yaw: 0.2, pitch: 0, fov: 75 },
    });
    const ready = await session.show({
      url: "/panoramas/fast.jpg",
      camera: { yaw: 0.8, pitch: 0, fov: 75 },
    });
    expect(ready.activeUrl).toBe("/panoramas/fast.jpg");
    releaseSlow?.();
    await slow;
    expect(session.snapshot().activeUrl).toBe("/panoramas/fast.jpg");
    expect(session.snapshot().status).toBe("ready");
    session.dispose();
  });

  it("reports a failed scene without rejecting the caller", async () => {
    const gpu = backend();
    const session = new PanoramaSession(gpu.impl, {
      yaw: 0,
      pitch: 0,
      fov: 75,
    });
    const ends: string[] = [];
    const snapshot = await session.show(
      {
        url: "fail:/panoramas/missing.jpg",
        camera: { yaw: 0, pitch: 0, fov: 75 },
      },
      { onStart: () => ends.push("start"), onEnd: () => ends.push("end") },
    );
    expect(snapshot.status).toBe("error");
    expect(snapshot.error).toBe("fail");
    expect(ends).toEqual(["start", "end"]);
    session.dispose();
  });
});

describe("panorama loading progress", () => {
  it("reports byte progress when the response publishes a length", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]));
        controller.enqueue(new Uint8Array([3, 4]));
        controller.close();
      },
    });
    const response = new Response(stream, {
      headers: { "content-length": "4", "content-type": "image/jpeg" },
    });
    const seen: Array<number | null> = [];
    const blob = await readResponseBlob(response, (ratio) => seen.push(ratio));
    expect(blob.size).toBe(4);
    expect(seen.at(-1)).toBe(1);
    expect(seen.some((ratio) => ratio !== null && ratio < 1)).toBe(true);
  });

  it("keeps loading when the length is unknown", async () => {
    const response = new Response(new Uint8Array([1, 2, 3]));
    const seen: Array<number | null> = [];
    const blob = await readResponseBlob(response, (ratio) => seen.push(ratio));
    expect(blob.size).toBe(3);
    expect(seen).toEqual([null]);
  });
});
