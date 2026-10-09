import { authorizeAdminForm, authorizeAdminHeader } from "@/lib/auth";
import {
  adminAuthResponse,
  adminTourRedirect,
  jsonError,
  storageFailureResponse,
  wantsAdminRedirect,
} from "@/lib/api/admin-route";
import { deleteAssetObjects } from "@/lib/assets/repository";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function removeAsset(
  request: Request,
  id: string,
  formData: FormData | null,
) {
  try {
    if (formData) await authorizeAdminForm(formData);
    else await authorizeAdminHeader(request);
  } catch (error) {
    const response = adminAuthResponse(error);
    if (response) return response;
    throw error;
  }

  if (formData && formData.get("confirm") !== "delete") {
    return jsonError("Deletion was not confirmed.", 400);
  }

  const asset = await db.asset.findUnique({
    where: { id },
    include: { variants: true },
  });
  if (!asset) return jsonError("Asset not found.", 404);

  try {
    await deleteAssetObjects(asset);
  } catch (error) {
    const storage = storageFailureResponse(error);
    if (storage && formData && wantsAdminRedirect(formData)) {
      return adminTourRedirect(request, asset.tourId, { error: "storage" });
    }
    if (storage) return storage;
    throw error;
  }

  await db.asset.delete({ where: { id } });
  if (formData && wantsAdminRedirect(formData)) {
    return adminTourRedirect(request, asset.tourId, { assets: "deleted" });
  }
  return Response.json({ id, deleted: true });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return removeAsset(request, id, null);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Expected a form post.", 400);
  }
  const { id } = await context.params;
  return removeAsset(request, id, formData);
}
