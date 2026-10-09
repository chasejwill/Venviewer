import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import {
  MAX_IMAGE_EDGE,
  PREVIEW_MAX_WIDTH,
  SINGLE_ADMIN_ORGANIZATION_ID,
  THUMBNAIL_HEIGHT,
  THUMBNAIL_WIDTH,
} from "@/lib/assets/constants";
import { sha256Hex } from "@/lib/assets/checksum";
import type { AssetVariantKind } from "@/lib/assets/types";
import {
  buildAssetObjectKey,
  sanitizeFilename,
  validatePanoramaUpload,
} from "@/lib/assets/validation";
import type { StorageProvider } from "@/lib/storage/types";

const SHARP_LIMIT = MAX_IMAGE_EDGE * MAX_IMAGE_EDGE;

export type StoredAssetRow = {
  id: string;
  tourId: string;
  type: string;
  originalFilename: string | null;
  storageProvider: string;
  bucket: string;
  objectKey: string;
  checksum: string | null;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  processingStatus: string;
  lifecycleStatus: string;
  visibility: string;
  processingError: string | null;
  createdAt: Date;
  updatedAt: Date;
  variants: StoredVariantRow[];
};

export type StoredVariantRow = {
  id: string;
  assetId: string;
  variant: string;
  storageProvider: string;
  bucket: string;
  objectKey: string;
  checksum: string | null;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  createdAt: Date;
};

export type AssetRepository = {
  createProcessing(input: {
    id: string;
    tourId: string;
    originalFilename: string;
    storageProvider: string;
    bucket: string;
    objectKey: string;
    checksum: string;
    mimeType: string;
    byteSize: number;
    width: number;
    height: number;
  }): Promise<StoredAssetRow>;
  markReady(
    id: string,
    variants: Array<{
      variant: "preview" | "thumbnail";
      storageProvider: string;
      bucket: string;
      objectKey: string;
      checksum: string;
      mimeType: string;
      byteSize: number;
      width: number;
      height: number;
    }>,
  ): Promise<StoredAssetRow>;
  markFailed(id: string, message: string): Promise<void>;
};

export type IngestSuccess = { ok: true; asset: StoredAssetRow };
export type IngestFailure = { ok: false; status: 400 | 500; error: string };
export type IngestResult = IngestSuccess | IngestFailure;

function mimeFromFormat(format: string | undefined): string | null {
  if (format === "jpeg") return "image/jpeg";
  if (format === "png") return "image/png";
  if (format === "webp") return "image/webp";
  return null;
}

async function removeStored(
  provider: StorageProvider,
  objects: Array<{ bucket: string; objectKey: string }>,
): Promise<void> {
  await Promise.all(
    objects.map((object) =>
      provider
        .deleteObject(object.bucket, object.objectKey)
        .catch(() => undefined),
    ),
  );
}

export async function ingestPanorama(input: {
  tourId: string;
  filename: string;
  bytes: Buffer;
  maxByteSize: number;
  provider: StorageProvider;
  repository: AssetRepository;
}): Promise<IngestResult> {
  const filename = sanitizeFilename(input.filename || "upload");
  const directory = await mkdtemp(path.join(tmpdir(), "venviewer-asset-"));
  const stored: Array<{ bucket: string; objectKey: string }> = [];
  let assetId: string | null = null;

  try {
    const originalPath = path.join(directory, "original");
    await writeFile(originalPath, input.bytes);
    const metadata = await sharp(originalPath, {
      limitInputPixels: SHARP_LIMIT,
      sequentialRead: true,
    }).metadata();
    const mimeType = mimeFromFormat(metadata.format);
    if (!mimeType || !metadata.width || !metadata.height) {
      return {
        ok: false,
        status: 400,
        error: "Upload must be a JPEG, PNG, or WebP image.",
      };
    }
    if (metadata.width > MAX_IMAGE_EDGE || metadata.height > MAX_IMAGE_EDGE) {
      return {
        ok: false,
        status: 400,
        error: `Image edge exceeds ${MAX_IMAGE_EDGE} pixels.`,
      };
    }

    const validation = validatePanoramaUpload(
      {
        filename,
        mimeType,
        byteSize: input.bytes.byteLength,
        width: metadata.width,
        height: metadata.height,
      },
      { maxByteSize: input.maxByteSize },
    );
    if (!validation.valid) {
      return {
        ok: false,
        status: 400,
        error: validation.errors[0] ?? "Invalid upload.",
      };
    }

    const checksum = sha256Hex(input.bytes);
    const bucket = input.provider.defaultBucket;
    const id = randomUUID();
    const originalKey = buildAssetObjectKey({
      organizationId: SINGLE_ADMIN_ORGANIZATION_ID,
      tourId: input.tourId,
      assetId: id,
      variant: "original",
      filename,
    });

    const created = await input.repository.createProcessing({
      id,
      tourId: input.tourId,
      originalFilename: filename,
      storageProvider: input.provider.type,
      bucket,
      objectKey: originalKey,
      checksum,
      mimeType,
      byteSize: input.bytes.byteLength,
      width: metadata.width,
      height: metadata.height,
    });
    assetId = created.id;
    await input.provider.putObject({
      bucket,
      objectKey: originalKey,
      body: input.bytes,
      mimeType,
      checksum,
    });
    stored.push({ bucket, objectKey: originalKey });

    const previewPath = path.join(directory, "preview.jpg");
    const thumbnailPath = path.join(directory, "thumbnail.jpg");
    await sharp(originalPath, { limitInputPixels: SHARP_LIMIT })
      .rotate()
      .resize({ width: PREVIEW_MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(previewPath);
    await sharp(originalPath, { limitInputPixels: SHARP_LIMIT })
      .rotate()
      .resize({
        width: THUMBNAIL_WIDTH,
        height: THUMBNAIL_HEIGHT,
        fit: "cover",
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    const derived = await Promise.all(
      (
        [
          ["preview", previewPath],
          ["thumbnail", thumbnailPath],
        ] as const
      ).map(async ([variant, filePath]) => {
        const body = await readFile(filePath);
        const info = await sharp(body).metadata();
        const objectKey = buildAssetObjectKey({
          organizationId: SINGLE_ADMIN_ORGANIZATION_ID,
          tourId: input.tourId,
          assetId: id,
          variant,
          filename: `${variant}.jpg`,
        });
        const variantChecksum = sha256Hex(body);
        await input.provider.putObject({
          bucket,
          objectKey,
          body,
          mimeType: "image/jpeg",
          checksum: variantChecksum,
        });
        stored.push({ bucket, objectKey });
        return {
          variant,
          storageProvider: input.provider.type,
          bucket,
          objectKey,
          checksum: variantChecksum,
          mimeType: "image/jpeg",
          byteSize: body.byteLength,
          width: info.width ?? 0,
          height: info.height ?? 0,
        };
      }),
    );

    const ready = await input.repository.markReady(created.id, derived);
    return { ok: true, asset: ready };
  } catch (error) {
    await removeStored(input.provider, stored);
    if (assetId) {
      const message =
        error instanceof Error ? error.message : "Processing failed.";
      await input.repository
        .markFailed(assetId, message)
        .catch(() => undefined);
    }
    return {
      ok: false,
      status: 500,
      error: "The panorama could not be processed.",
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export function deliveryBlockReason(asset: {
  lifecycleStatus: string;
  processingStatus: string;
}): "archived" | "not-ready" | null {
  if (asset.lifecycleStatus !== "active") return "archived";
  if (asset.processingStatus !== "ready") return "not-ready";
  return null;
}

export function isDeliveryVariant(
  value: string | null,
): value is Extract<AssetVariantKind, "original" | "preview" | "thumbnail"> {
  return value === "original" || value === "preview" || value === "thumbnail";
}
