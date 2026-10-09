import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  GetObjectResult,
  PutObjectInput,
  SignedUrlOptions,
  StorageProvider,
  StorageProviderConfig,
  StoredObjectReference,
} from "../types";

function resolveLocalPath(
  rootPath: string,
  bucket: string,
  objectKey: string,
): string {
  return path.join(rootPath, bucket, objectKey);
}

export class LocalStorageProvider implements StorageProvider {
  readonly type = "local" as const;
  readonly defaultBucket: string;
  private readonly rootPath: string;
  private readonly publicBaseUrl: string;

  constructor(config: StorageProviderConfig) {
    this.rootPath = config.localRootPath ?? path.join(process.cwd(), "storage");
    this.defaultBucket = config.defaultBucket ?? "venviewer-local";
    this.publicBaseUrl = config.publicBaseUrl ?? "http://localhost:3100";
  }

  async putObject(input: PutObjectInput): Promise<StoredObjectReference> {
    const filePath = resolveLocalPath(
      this.rootPath,
      input.bucket,
      input.objectKey,
    );
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, input.body);
    return {
      storageProvider: this.type,
      bucket: input.bucket,
      objectKey: input.objectKey,
    };
  }

  async getObject(bucket: string, objectKey: string): Promise<GetObjectResult> {
    const filePath = resolveLocalPath(this.rootPath, bucket, objectKey);
    const body = await readFile(filePath);
    const mimeType = inferMimeType(objectKey);
    return { body, mimeType, byteSize: body.byteLength };
  }

  async deleteObject(bucket: string, objectKey: string): Promise<void> {
    const filePath = resolveLocalPath(this.rootPath, bucket, objectKey);
    await rm(filePath, { force: true });
  }

  async objectExists(bucket: string, objectKey: string): Promise<boolean> {
    try {
      const filePath = resolveLocalPath(this.rootPath, bucket, objectKey);
      await stat(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async createAuthorizedUrl(
    bucket: string,
    objectKey: string,
    options?: SignedUrlOptions,
  ): Promise<string> {
    const params = new URLSearchParams({
      bucket,
      key: objectKey,
      expires: String(
        Math.floor(Date.now() / 1000) + (options?.expiresInSeconds ?? 900),
      ),
    });
    if (options?.disposition) params.set("disposition", options.disposition);
    if (options?.filename) params.set("filename", options.filename);
    return `${this.publicBaseUrl}/api/assets/delivery/local?${params.toString()}`;
  }
}

function inferMimeType(objectKey: string): string {
  const ext = path.extname(objectKey).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}
