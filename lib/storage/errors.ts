export class StorageError extends Error {
  readonly code: string;
  readonly statusCode?: number;

  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = "StorageError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function normalizeStorageError(error: unknown): StorageError {
  if (error instanceof StorageError) return error;

  const message =
    error instanceof Error ? error.message : "Storage operation failed.";
  const name = error instanceof Error ? error.name : "UnknownError";

  if (
    name === "NoSuchKey" ||
    message.includes("NoSuchKey") ||
    message.includes("Not Found")
  ) {
    return new StorageError("Object not found.", "NOT_FOUND", 404);
  }

  if (message.includes("AccessDenied") || message.includes("Forbidden")) {
    return new StorageError("Storage access denied.", "ACCESS_DENIED", 403);
  }

  return new StorageError("Storage operation failed.", "STORAGE_ERROR", 500);
}
