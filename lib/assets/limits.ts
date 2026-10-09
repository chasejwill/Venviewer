import { DEFAULT_MAX_PANORAMA_BYTES } from "@/lib/assets/validation";

export function readAssetMaxBytes(
  env: Record<string, string | undefined> = process.env,
): number {
  const raw = env.ASSET_MAX_BYTES?.trim();
  if (!raw) return DEFAULT_MAX_PANORAMA_BYTES;
  if (!/^[1-9]\d*$/.test(raw)) {
    throw new Error("ASSET_MAX_BYTES must be a positive integer.");
  }
  return Number(raw);
}
