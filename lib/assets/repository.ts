import type { Asset, AssetVariant } from "@prisma/client";
import type {
  AssetRepository,
  StoredAssetRow,
  StoredVariantRow,
} from "@/lib/assets/pipeline";
import { db } from "@/lib/db";
import { getAppStorageProvider } from "@/lib/storage/app-config";

function toVariant(variant: AssetVariant): StoredVariantRow {
  return {
    id: variant.id,
    assetId: variant.assetId,
    variant: variant.variant,
    storageProvider: variant.storageProvider,
    bucket: variant.bucket,
    objectKey: variant.objectKey,
    checksum: variant.checksum,
    mimeType: variant.mimeType,
    byteSize: variant.byteSize,
    width: variant.width,
    height: variant.height,
    createdAt: variant.createdAt,
  };
}

function toAsset(asset: Asset & { variants: AssetVariant[] }): StoredAssetRow {
  return {
    id: asset.id,
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
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
    variants: asset.variants.map(toVariant),
  };
}

export const prismaAssetRepository: AssetRepository = {
  async createProcessing(input) {
    const asset = await db.asset.create({
      data: {
        id: input.id,
        tourId: input.tourId,
        type: "panorama",
        originalFilename: input.originalFilename,
        storageProvider: input.storageProvider,
        bucket: input.bucket,
        objectKey: input.objectKey,
        checksum: input.checksum,
        mimeType: input.mimeType,
        byteSize: input.byteSize,
        width: input.width,
        height: input.height,
        processingStatus: "processing",
        lifecycleStatus: "active",
        visibility: "private",
      },
      include: { variants: true },
    });
    return toAsset(asset);
  },
  async markReady(id, variants) {
    const asset = await db.asset.update({
      where: { id },
      data: {
        processingStatus: "ready",
        processingError: null,
        variants: { create: variants },
      },
      include: { variants: true },
    });
    return toAsset(asset);
  },
  async markFailed(id, message) {
    await db.asset.update({
      where: { id },
      data: {
        processingStatus: "failed",
        processingError: message.slice(0, 500),
      },
    });
  },
};

export async function deleteAssetObjects(asset: {
  bucket: string;
  objectKey: string;
  variants: Array<{ bucket: string; objectKey: string }>;
}): Promise<void> {
  const provider = getAppStorageProvider();
  await provider
    .deleteObject(asset.bucket, asset.objectKey)
    .catch(() => undefined);
  await Promise.all(
    asset.variants.map((variant) =>
      provider
        .deleteObject(variant.bucket, variant.objectKey)
        .catch(() => undefined),
    ),
  );
}
