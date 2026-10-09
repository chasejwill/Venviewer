import {
  authorizeAdminForm,
  authorizeAdminHeader,
  getSession,
} from "@/lib/auth";
import {
  adminAuthResponse,
  jsonError,
  storageFailureResponse,
} from "@/lib/api/admin-route";
import { SINGLE_ADMIN_ORGANIZATION_ID } from "@/lib/assets/constants";
import {
  createDeliveryToken,
  deliveryTokenTtlMs,
  verifyDeliveryToken,
} from "@/lib/assets/delivery-token";
import { deliveryBlockReason, isDeliveryVariant } from "@/lib/assets/pipeline";
import { readDeliverySecret } from "@/lib/assets/secrets";
import { db } from "@/lib/db";
import { getAppStorageProvider } from "@/lib/storage/app-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorizeMint(request: Request): Promise<Response | null> {
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      await authorizeAdminForm(await request.formData());
    } else {
      await authorizeAdminHeader(request);
    }
    return null;
  } catch (error) {
    return adminAuthResponse(error) ?? jsonError("Invalid request.", 403);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const denied = await authorizeMint(request);
  if (denied) return denied;

  const { id } = await context.params;
  const url = new URL(request.url);
  const variant = url.searchParams.get("variant") ?? "preview";
  if (!isDeliveryVariant(variant)) {
    return jsonError("Variant must be original, preview, or thumbnail.", 400);
  }

  const asset = await db.asset.findUnique({
    where: { id },
    include: { variants: true },
  });
  if (!asset || deliveryBlockReason(asset)) {
    return jsonError("Asset not found.", 404);
  }
  if (
    variant !== "original" &&
    !asset.variants.some((item) => item.variant === variant)
  ) {
    return jsonError("Asset not found.", 404);
  }

  let secret: string;
  try {
    secret = readDeliverySecret();
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Delivery is not configured.",
      503,
    );
  }

  const expiresInSeconds = deliveryTokenTtlMs() / 1000;
  const token = createDeliveryToken(
    {
      assetId: asset.id,
      variant,
      organizationId: SINGLE_ADMIN_ORGANIZATION_ID,
      expiresAt: Date.now() + deliveryTokenTtlMs(),
      purpose: "management",
    },
    secret,
  );
  return Response.json({
    token,
    expiresInSeconds,
    deliveryPath: `/api/assets/${asset.id}/delivery?variant=${variant}&token=${token}`,
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const variant = url.searchParams.get("variant");
  if (!isDeliveryVariant(variant)) {
    return jsonError("Variant must be original, preview, or thumbnail.", 400);
  }

  const session = await getSession();
  if (!session) {
    const token = url.searchParams.get("token");
    let secret: string;
    try {
      secret = readDeliverySecret();
    } catch (error) {
      return jsonError(
        error instanceof Error ? error.message : "Delivery is not configured.",
        503,
      );
    }
    const payload = token ? verifyDeliveryToken(token, secret) : null;
    if (
      !payload ||
      payload.assetId !== id ||
      payload.variant !== variant ||
      payload.organizationId !== SINGLE_ADMIN_ORGANIZATION_ID
    ) {
      return jsonError("Authentication required.", 401);
    }
  }

  const asset = await db.asset.findUnique({
    where: { id },
    include: { variants: true },
  });
  if (!asset || deliveryBlockReason(asset)) {
    return jsonError("Asset not found.", 404);
  }

  const located =
    variant === "original"
      ? {
          bucket: asset.bucket,
          objectKey: asset.objectKey,
          mimeType: asset.mimeType,
        }
      : asset.variants.find((item) => item.variant === variant);
  if (!located) return jsonError("Asset not found.", 404);

  try {
    const provider = getAppStorageProvider();
    const object = await provider.getObject(located.bucket, located.objectKey);
    return new Response(new Uint8Array(object.body), {
      headers: {
        "Content-Type": located.mimeType || object.mimeType,
        "Content-Length": String(object.byteSize),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const storage = storageFailureResponse(error);
    if (storage) return storage;
    return jsonError("Asset could not be read.", 500);
  }
}
