export type AssetType =
  "panorama" | "logo" | "thumbnail" | "preview" | "manifest" | "other";

export type AssetVariantKind =
  "original" | "preview" | "thumbnail" | "optimized" | "tile_set";

export type AssetLifecycleStatus = "active" | "archived" | "deleted";

export type DeliveryTokenPurpose = "management" | "branding" | "viewer";

export type AssetProcessingStatus =
  "pending" | "processing" | "ready" | "failed";

export type AssetVisibility = "private" | "organization" | "public";

export interface AssetRecord {
  id: string;
  organizationId: string;
  tourId: string | null;
  type: AssetType;
  originalFilename: string | null;
  storageProvider: string;
  bucket: string;
  objectKey: string;
  checksum: string | null;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  processingStatus: AssetProcessingStatus;
  lifecycleStatus: AssetLifecycleStatus;
  visibility: AssetVisibility;
  processingError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetVariantRecord {
  id: string;
  assetId: string;
  variant: AssetVariantKind;
  storageProvider: string;
  bucket: string;
  objectKey: string;
  checksum: string | null;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export interface AssetStorageLocation {
  storageProvider: string;
  bucket: string;
  objectKey: string;
}

export interface ImageMetadata {
  width: number;
  height: number;
  mimeType: string;
  byteSize: number;
}

export interface UploadValidationOptions {
  maxByteSize?: number;
  allowedMimeTypes?: string[];
}

export interface UploadValidationResult {
  valid: boolean;
  errors: string[];
  metadata?: ImageMetadata;
}

export interface NativeTourAssetSummary {
  assetId: string;
  type: AssetType;
  processingStatus: AssetProcessingStatus;
  width: number | null;
  height: number | null;
  variants: AssetVariantKind[];
}

export interface NativeTourMetadata {
  tourId: string;
  assetCount: number;
  assets: NativeTourAssetSummary[];
  ready: boolean;
}
