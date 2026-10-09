import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "node:stream";
import { StorageError, normalizeStorageError } from "../errors";
import type {
  GetObjectResult,
  PutObjectInput,
  SignedUrlOptions,
  StorageProvider,
  StoredObjectReference,
} from "../types";
import type { R2StorageConfig } from "../config";

async function streamToBuffer(body: unknown): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (body instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
  throw new StorageError("Unsupported object body type.", "INVALID_BODY");
}

export interface R2StorageProviderOptions {
  config: R2StorageConfig;
  client?: S3Client;
  appBaseUrl?: string;
}

export class R2StorageProvider implements StorageProvider {
  readonly type = "r2" as const;
  readonly defaultBucket: string;
  private readonly client: S3Client;
  private readonly appBaseUrl: string;

  constructor(options: R2StorageProviderOptions) {
    this.defaultBucket = options.config.bucket;
    this.appBaseUrl = options.appBaseUrl ?? "http://localhost:3100";
    this.client =
      options.client ??
      new S3Client({
        region: options.config.region,
        endpoint: options.config.endpoint,
        credentials: {
          accessKeyId: options.config.accessKeyId,
          secretAccessKey: options.config.secretAccessKey,
        },
        forcePathStyle: true,
      } satisfies S3ClientConfig);
  }

  async putObject(input: PutObjectInput): Promise<StoredObjectReference> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: input.bucket,
          Key: input.objectKey,
          Body: input.body,
          ContentType: input.mimeType,
          ChecksumSHA256: input.checksum
            ? Buffer.from(input.checksum, "hex").toString("base64")
            : undefined,
        }),
      );
      return {
        storageProvider: this.type,
        bucket: input.bucket,
        objectKey: input.objectKey,
      };
    } catch (error) {
      throw normalizeStorageError(error);
    }
  }

  async getObject(bucket: string, objectKey: string): Promise<GetObjectResult> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: bucket, Key: objectKey }),
      );
      const body = await streamToBuffer(response.Body);
      return {
        body,
        mimeType: response.ContentType ?? "application/octet-stream",
        byteSize: body.byteLength,
      };
    } catch (error) {
      throw normalizeStorageError(error);
    }
  }

  async deleteObject(bucket: string, objectKey: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }),
      );
    } catch (error) {
      throw normalizeStorageError(error);
    }
  }

  async objectExists(bucket: string, objectKey: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: objectKey }),
      );
      return true;
    } catch (error) {
      const normalized = normalizeStorageError(error);
      if (normalized.code === "NOT_FOUND") return false;
      throw normalized;
    }
  }

  async createAuthorizedUrl(
    bucket: string,
    objectKey: string,
    options?: SignedUrlOptions,
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        ResponseContentDisposition:
          options?.disposition === "attachment" && options.filename
            ? `attachment; filename="${options.filename}"`
            : options?.disposition,
      });
      return getSignedUrl(this.client, command, {
        expiresIn: options?.expiresInSeconds ?? 900,
      });
    } catch (error) {
      throw normalizeStorageError(error);
    }
  }
}

export function createR2Client(config: R2StorageConfig): S3Client {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });
}
