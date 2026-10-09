import { NextResponse } from "next/server";
import { AdminAuthError } from "@/lib/auth";
import { AssetStorageUnavailableError } from "@/lib/storage/app-config";

export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export function adminAuthResponse(error: unknown): Response | null {
  if (error instanceof AdminAuthError) {
    return jsonError(error.message, error.status);
  }
  return null;
}

export function storageFailureResponse(error: unknown): Response | null {
  if (error instanceof AssetStorageUnavailableError) {
    return jsonError(error.message, 503);
  }
  return null;
}

export function wantsAdminRedirect(formData: FormData): boolean {
  return formData.get("redirect") === "admin";
}

export function adminTourRedirect(
  request: Request,
  tourId: string,
  query: Record<string, string>,
): NextResponse {
  const url = new URL(`/admin/tours/${tourId}`, request.url);
  for (const [key, value] of Object.entries(query))
    url.searchParams.set(key, value);
  return NextResponse.redirect(url, 303);
}
