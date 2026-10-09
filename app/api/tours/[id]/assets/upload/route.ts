import { authorizeAdminForm } from "@/lib/auth";
import {
  adminAuthResponse,
  adminTourRedirect,
  jsonError,
  storageFailureResponse,
  wantsAdminRedirect,
} from "@/lib/api/admin-route";
import { readAssetMaxBytes } from "@/lib/assets/limits";
import { ingestPanorama } from "@/lib/assets/pipeline";
import { prismaAssetRepository } from "@/lib/assets/repository";
import { serializeAsset } from "@/lib/assets/serialize";
import { db } from "@/lib/db";
import { getAppStorageProvider } from "@/lib/storage/app-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Expected a multipart upload.", 400);
  }

  try {
    await authorizeAdminForm(formData);
  } catch (error) {
    const response = adminAuthResponse(error);
    if (response) return response;
    throw error;
  }

  const { id } = await context.params;
  const tour = await db.tour.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!tour) return jsonError("Tour not found.", 404);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return redirectOrJson(request, formData, id, {
      error: "Choose an image file.",
      status: 400,
      code: "upload",
    });
  }

  let maxByteSize: number;
  try {
    maxByteSize = readAssetMaxBytes();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid upload limit.";
    return redirectOrJson(request, formData, id, {
      error: message,
      status: 500,
      code: "upload",
    });
  }

  let provider;
  try {
    provider = getAppStorageProvider();
  } catch (error) {
    const response = storageFailureResponse(error);
    if (response && wantsAdminRedirect(formData)) {
      return adminTourRedirect(request, id, { error: "storage" });
    }
    if (response) return response;
    throw error;
  }

  const result = await ingestPanorama({
    tourId: id,
    filename: file.name,
    bytes: Buffer.from(await file.arrayBuffer()),
    maxByteSize,
    provider,
    repository: prismaAssetRepository,
  });
  if (!result.ok) {
    return redirectOrJson(request, formData, id, {
      error: result.error,
      status: result.status,
      code: "upload",
    });
  }
  if (wantsAdminRedirect(formData)) {
    return adminTourRedirect(request, id, { assets: "1" });
  }
  return Response.json(serializeAsset(result.asset), { status: 201 });
}

function redirectOrJson(
  request: Request,
  formData: FormData,
  tourId: string,
  failure: { error: string; status: number; code: string },
) {
  if (wantsAdminRedirect(formData)) {
    return adminTourRedirect(request, tourId, { error: failure.code });
  }
  return jsonError(failure.error, failure.status);
}
