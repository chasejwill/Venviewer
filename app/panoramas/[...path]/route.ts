import { readFile } from "node:fs/promises";
import { db } from "@/lib/db";
import {
  panoramaContentType,
  resolvePanoramaFile,
} from "@/lib/providers/panorama-files";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await context.params;
  const assetId = `/panoramas/${parts.join("/")}`;
  const filePath = resolvePanoramaFile(assetId);
  if (!filePath) return new Response(null, { status: 404 });

  const published = await db.scene.findFirst({
    where: {
      tour: { published: true, provider: "venviewer-native" },
      OR: [{ panoramaAssetId: assetId }, { thumbnailAssetId: assetId }],
    },
    select: { id: true },
  });
  if (!published) return new Response(null, { status: 404 });

  try {
    const bytes = await readFile(filePath);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": panoramaContentType(assetId),
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
