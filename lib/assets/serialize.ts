import { SINGLE_ADMIN_ORGANIZATION_ID } from "@/lib/assets/constants";
import type { StoredAssetRow } from "@/lib/assets/pipeline";

export function serializeAsset(asset: StoredAssetRow) {
  return {
    id: asset.id,
    organizationId: SINGLE_ADMIN_ORGANIZATION_ID,
    tourId: asset.tourId,
    type: asset.type,
    originalFilename: asset.originalFilename,
    storageProvider: asset.storageProvider,
    bucket: asset.bucket,
    objectKey: asset.objectKey,
    checksum: asset.checksum,
    mimeType: asset.mimeType,
    byteSize: asset.byteSize,
    width: asset.width,
    height: asset.height,
    processingStatus: asset.processingStatus,
    lifecycleStatus: asset.lifecycleStatus,
    visibility: asset.visibility,
    processingError: asset.processingError,
    variants: asset.variants.map((variant) => ({
      variant: variant.variant,
      storageProvider: variant.storageProvider,
      bucket: variant.bucket,
      objectKey: variant.objectKey,
      mimeType: variant.mimeType,
      byteSize: variant.byteSize,
      width: variant.width,
      height: variant.height,
    })),
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  };
}
