import path from "node:path";
import { isSafePanoramaAssetId } from "@/lib/spatial/model";

export function panoramaStorageRoot(): string {
  return path.join(process.cwd(), "storage", "panoramas");
}

/**
 * Maps a same-origin panorama identity to a file inside the private storage
 * root. Returns null when the identity could escape that root.
 */
export function resolvePanoramaFile(
  assetId: string,
  root = panoramaStorageRoot(),
): string | null {
  if (!isSafePanoramaAssetId(assetId)) return null;
  const relative = assetId.slice("/panoramas/".length);
  const rootPath = path.resolve(root);
  const resolved = path.resolve(rootPath, relative);
  if (resolved !== rootPath && !resolved.startsWith(`${rootPath}${path.sep}`)) {
    return null;
  }
  return resolved;
}

export function panoramaContentType(assetId: string): string {
  if (assetId.endsWith(".png")) return "image/png";
  if (assetId.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}
