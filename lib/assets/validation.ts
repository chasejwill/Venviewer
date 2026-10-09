import type {
  AssetVariantKind,
  UploadValidationOptions,
  UploadValidationResult,
} from "./types";

export const DEFAULT_ALLOWED_PANORAMA_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const DEFAULT_MAX_PANORAMA_BYTES = 50 * 1024 * 1024;

export function validatePanoramaUpload(
  input: {
    filename: string;
    mimeType: string;
    byteSize: number;
    width?: number | null;
    height?: number | null;
  },
  options: UploadValidationOptions = {},
): UploadValidationResult {
  const errors: string[] = [];
  const allowedMimeTypes = options.allowedMimeTypes ?? [
    ...DEFAULT_ALLOWED_PANORAMA_MIME_TYPES,
  ];
  const maxByteSize = options.maxByteSize ?? DEFAULT_MAX_PANORAMA_BYTES;

  if (!input.filename.trim()) {
    errors.push("Filename is required.");
  }

  if (!allowedMimeTypes.includes(input.mimeType)) {
    errors.push(
      `Unsupported file type: ${input.mimeType}. Allowed: ${allowedMimeTypes.join(", ")}`,
    );
  }

  if (input.byteSize <= 0) {
    errors.push("File is empty.");
  }

  if (input.byteSize > maxByteSize) {
    errors.push(`File exceeds maximum size of ${maxByteSize} bytes.`);
  }

  if (input.width != null && input.height != null) {
    if (input.width <= 0 || input.height <= 0) {
      errors.push("Image dimensions are invalid.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    metadata:
      errors.length === 0 && input.width != null && input.height != null
        ? {
            width: input.width,
            height: input.height,
            mimeType: input.mimeType,
            byteSize: input.byteSize,
          }
        : undefined,
  };
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}

export interface ObjectKeyParts {
  organizationId: string;
  tourId: string;
  assetId: string;
  variant: AssetVariantKind;
  filename: string;
}

export function buildAssetObjectKey(parts: ObjectKeyParts): string {
  const safeName = sanitizeFilename(parts.filename);
  const variantFolder =
    parts.variant === "original"
      ? "original"
      : parts.variant === "preview"
        ? "previews"
        : parts.variant === "thumbnail"
          ? "thumbnails"
          : parts.variant;

  return [
    "organizations",
    parts.organizationId,
    "tours",
    parts.tourId,
    "assets",
    parts.assetId,
    variantFolder,
    safeName,
  ].join("/");
}

export function assertOrganizationAccess(
  assetOrganizationId: string,
  requestOrganizationId: string,
): boolean {
  return assetOrganizationId === requestOrganizationId;
}
