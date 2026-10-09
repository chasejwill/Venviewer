import type {
  AssetRecord,
  AssetVariantRecord,
  NativeTourMetadata,
} from "./types";

export function buildNativeTourMetadata(
  tourId: string,
  assets: Array<AssetRecord & { variants: AssetVariantRecord[] }>,
): NativeTourMetadata {
  return {
    tourId,
    assetCount: assets.length,
    assets: assets.map((asset) => ({
      assetId: asset.id,
      type: asset.type,
      processingStatus: asset.processingStatus,
      width: asset.width,
      height: asset.height,
      variants: asset.variants.map((variant) => variant.variant),
    })),
    ready: assets.every((asset) => asset.processingStatus === "ready"),
  };
}

export function isNativeProviderReady(metadata: NativeTourMetadata): boolean {
  return metadata.assetCount > 0 && metadata.ready;
}
