import { createHash } from "node:crypto";

/** SHA-256 hex digest used for asset integrity verification. */
export const ASSET_CHECKSUM_ALGORITHM = "sha256" as const;

export function describeChecksumAlgorithm(): string {
  return "SHA-256 (hex-encoded digest stored on Asset and AssetVariant records)";
}

export function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}
