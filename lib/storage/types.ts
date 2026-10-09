export type StorageProviderType =
  "local" | "s3" | "r2" | "gcs" | "azure" | "self_hosted";

export interface StoredObjectReference {
  storageProvider: StorageProviderType;
  bucket: string;
  objectKey: string;
}

export interface PutObjectInput {
  bucket: string;
  objectKey: string;
  body: Buffer;
  mimeType: string;
  checksum?: string;
}

export interface GetObjectResult {
  body: Buffer;
  mimeType: string;
  byteSize: number;
}

export interface SignedUrlOptions {
  expiresInSeconds?: number;
  disposition?: "inline" | "attachment";
  filename?: string;
}

export interface StorageProvider {
  readonly type: StorageProviderType;
  readonly defaultBucket: string;
  putObject(input: PutObjectInput): Promise<StoredObjectReference>;
  getObject(bucket: string, objectKey: string): Promise<GetObjectResult>;
  deleteObject(bucket: string, objectKey: string): Promise<void>;
  objectExists(bucket: string, objectKey: string): Promise<boolean>;
  createAuthorizedUrl(
    bucket: string,
    objectKey: string,
    options?: SignedUrlOptions,
  ): Promise<string>;
}

export interface R2ProviderConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
  region: string;
}

export interface StorageProviderConfig {
  type: StorageProviderType;
  localRootPath?: string;
  defaultBucket?: string;
  publicBaseUrl?: string;
  r2?: R2ProviderConfig;
}
