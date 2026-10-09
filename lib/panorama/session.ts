import { CameraRig, type CameraState } from "@/lib/panorama/camera";

export const PANORAMA_TEXTURE_CACHE_LIMIT = 3;

export type TextureResource = {
  id: string;
  url: string;
  dispose: () => void;
};

export type ViewportSize = {
  width: number;
  height: number;
};

export type PanoramaStatus = "loading" | "ready" | "error";

export type PanoramaSnapshot = {
  status: PanoramaStatus;
  error: string | null;
  progress: number | null;
  activeUrl: string | null;
};

export interface PanoramaBackend {
  load(
    url: string,
    onProgress?: (ratio: number | null) => void,
  ): Promise<TextureResource>;
  draw(texture: TextureResource, camera: CameraState, size: ViewportSize): void;
  dispose(): void;
}

type TransitionHooks = {
  onStart?: () => void;
  onEnd?: () => void;
};

/**
 * Owns scene texture residency separately from React state. The cache keeps
 * the active texture plus a small set of preloaded neighbors, then disposes
 * the rest so a long visit does not accumulate GPU resources.
 */
export class PanoramaSession {
  readonly camera: CameraRig;
  private readonly cache = new Map<string, TextureResource>();
  private activeUrl: string | null = null;
  private loadToken = 0;
  private status: PanoramaStatus = "loading";
  private error: string | null = null;
  private progress: number | null = null;
  private lastProgress = -1;
  onChange: ((snapshot: PanoramaSnapshot) => void) | null = null;

  constructor(
    private readonly backend: PanoramaBackend,
    initial: CameraState,
  ) {
    this.camera = new CameraRig(initial);
  }

  snapshot(): PanoramaSnapshot {
    return {
      status: this.status,
      error: this.error,
      progress: this.progress,
      activeUrl: this.activeUrl,
    };
  }

  get residentTextureCount() {
    return this.cache.size;
  }

  async show(
    request: { url: string; camera: CameraState },
    hooks?: TransitionHooks,
  ): Promise<PanoramaSnapshot> {
    const token = ++this.loadToken;
    hooks?.onStart?.();
    this.status = "loading";
    this.error = null;
    this.progress = null;
    this.lastProgress = -1;
    this.emit();
    try {
      const texture = await this.retain(request.url, (ratio) => {
        if (token !== this.loadToken) return;
        this.publishProgress(ratio);
      });
      if (token !== this.loadToken) return this.snapshot();
      this.activeUrl = texture.url;
      this.camera.snap(request.camera);
      this.status = "ready";
      this.progress = 1;
      this.evict();
      this.emit();
      hooks?.onEnd?.();
      return this.snapshot();
    } catch (error) {
      if (token !== this.loadToken) return this.snapshot();
      this.status = "error";
      this.progress = null;
      this.error =
        error instanceof Error ? error.message : "Unable to load this view.";
      this.emit();
      hooks?.onEnd?.();
      return this.snapshot();
    }
  }

  async preload(url: string): Promise<void> {
    await this.retain(url);
    this.evict();
  }

  frame(dt: number, size: ViewportSize, reducedMotion: boolean) {
    const camera = this.camera.tick(dt, reducedMotion);
    if (this.status !== "ready" || !this.activeUrl) return;
    const texture = this.cache.get(this.activeUrl);
    if (!texture) return;
    if (size.width < 1 || size.height < 1) return;
    this.backend.draw(texture, camera, size);
  }

  interrupt() {
    this.camera.interrupt();
  }

  dispose() {
    this.loadToken += 1;
    for (const texture of this.cache.values()) texture.dispose();
    this.cache.clear();
    this.activeUrl = null;
    this.backend.dispose();
  }

  private async retain(
    url: string,
    onProgress?: (ratio: number | null) => void,
  ) {
    const existing = this.cache.get(url);
    if (existing) {
      this.cache.delete(url);
      this.cache.set(url, existing);
      onProgress?.(1);
      return existing;
    }
    const texture = await this.backend.load(url, onProgress);
    this.cache.set(url, texture);
    return texture;
  }

  private publishProgress(ratio: number | null) {
    if (ratio === null) {
      if (this.progress !== null) {
        this.progress = null;
        this.emit();
      }
      return;
    }
    if (ratio < 1 && ratio - this.lastProgress < 0.05) return;
    this.lastProgress = ratio;
    this.progress = ratio;
    this.emit();
  }

  private evict() {
    for (const [url, texture] of [...this.cache.entries()]) {
      if (this.cache.size <= PANORAMA_TEXTURE_CACHE_LIMIT) break;
      if (url === this.activeUrl) continue;
      this.cache.delete(url);
      texture.dispose();
    }
  }

  private emit() {
    this.onChange?.(this.snapshot());
  }
}
