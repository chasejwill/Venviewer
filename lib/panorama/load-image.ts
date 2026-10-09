import { isSafePanoramaAssetId } from "@/lib/spatial/model";

export async function readResponseBlob(
  response: Response,
  onProgress?: (ratio: number | null) => void,
): Promise<Blob> {
  if (!response.ok) {
    throw new Error("This view could not be loaded.");
  }
  const total = Number(response.headers.get("content-length"));
  if (!response.body || !Number.isFinite(total) || total <= 0) {
    onProgress?.(null);
    return response.blob();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    chunks.push(value);
    received += value.byteLength;
    onProgress?.(Math.min(1, received / total));
  }
  onProgress?.(1);
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const type = response.headers.get("content-type") ?? "image/jpeg";
  return new Blob([bytes], { type });
}

export async function fetchPanoramaBlob(
  url: string,
  fetchImpl: typeof fetch = fetch,
  onProgress?: (ratio: number | null) => void,
): Promise<Blob> {
  if (!isSafePanoramaAssetId(url)) {
    throw new Error("This panorama reference is not allowed.");
  }
  const response = await fetchImpl(url);
  return readResponseBlob(response, onProgress);
}
