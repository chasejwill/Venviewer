import type { AssetType, AssetVariantKind } from "./types";

export interface DirectUploadAuthorizationRequest {
  organizationId: string;
  tourId?: string | null;
  assetType: AssetType;
  filename: string;
  mimeType: string;
  byteSize: number;
}

export interface DirectUploadAuthorization {
  assetId: string;
  bucket: string;
  objectKey: string;
  uploadUrl: string;
  expiresAt: string;
  headers?: Record<string, string>;
}

/**
 * Seam for future browser-to-object-storage uploads.
 * v0.2.1 keeps server-mediated uploads; implementations may stub authorize/confirm.
 */
export interface DirectUploadService {
  authorizeUpload(
    input: DirectUploadAuthorizationRequest,
  ): Promise<DirectUploadAuthorization>;
  confirmUpload(assetId: string, organizationId: string): Promise<void>;
}

export interface DirectUploadConfirmInput {
  assetId: string;
  organizationId: string;
  variant?: AssetVariantKind;
}
