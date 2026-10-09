import { authorizeAdminForm } from "@/lib/auth";
import {
  adminAuthResponse,
  adminTourRedirect,
  jsonError,
  wantsAdminRedirect,
} from "@/lib/api/admin-route";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

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
  try {
    await authorizeAdminForm(formData);
  } catch (error) {
    const response = adminAuthResponse(error);
    if (response) return response;
    throw error;
  }

  const { id } = await context.params;
  const asset = await db.asset.findUnique({
    where: { id },
    select: { id: true, tourId: true },
  });
  if (!asset) return jsonError("Asset not found.", 404);

  await db.asset.update({
    where: { id },
    data: { lifecycleStatus: "archived" },
  });

  if (wantsAdminRedirect(formData)) {
    return adminTourRedirect(request, asset.tourId, { assets: "archived" });
  }
  return Response.json({ id: asset.id, lifecycleStatus: "archived" });
}
