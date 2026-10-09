"use server";

import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  clearSession,
  createSession,
  credentialsAreValid,
  requireAdmin,
  verifyCsrf,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import {
  checkLoginRateLimit,
  clearLoginFailures,
  recordLoginFailure,
} from "@/lib/rate-limit";
import {
  nativeTourIsPublishable,
  tourViewerInclude,
} from "@/lib/providers/present";
import { parseTourForm } from "@/lib/tours";

export type ActionState = {
  error?: string;
  fields?: Record<string, string[] | undefined>;
};

export async function loginAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await verifyCsrf(formData);
  const requestHeaders = await headers();
  const key =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    requestHeaders.get("x-real-ip") ??
    "unknown";
  const limit = checkLoginRateLimit(key);
  if (!limit.allowed) {
    return {
      error: `Too many attempts. Try again in ${limit.retryAfterSeconds} seconds.`,
    };
  }

  const email = formData.get("email");
  const password = formData.get("password");
  const env = getEnv();
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !(await credentialsAreValid(
      email,
      password,
      env.VENVIEWER_LITE_ADMIN_EMAIL,
      env.VENVIEWER_LITE_ADMIN_PASSWORD_HASH,
    ))
  ) {
    recordLoginFailure(key);
    return { error: "Invalid email or password." };
  }

  clearLoginFailures(key);
  await createSession();
  redirect("/admin/tours");
}

export async function logoutAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await verifyCsrf(formData);
  await clearSession();
  redirect("/admin/login");
}

function validationState(
  result: ReturnType<typeof parseTourForm>,
): ActionState {
  if (result.success) return {};
  return {
    error: "Correct the highlighted fields.",
    fields: result.error.flatten().fieldErrors,
  };
}

export async function createTourAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  await verifyCsrf(formData);
  const result = parseTourForm(formData);
  if (!result.success) return validationState(result);

  try {
    const tour = await db.tour.create({
      data: { ...result.data, provider: "legacy-kuula" },
    });
    redirect(`/admin/tours/${tour.id}?saved=1`);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        error: "That slug is already in use.",
        fields: { slug: ["Choose a unique slug."] },
      };
    }
    throw error;
  }
}

export async function updateTourAction(
  id: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  await verifyCsrf(formData);
  const existing = await db.tour.findUnique({ where: { id } });
  if (!existing) return { error: "Tour not found." };
  if (existing.provider !== "legacy-kuula") {
    return {
      error: "Native tours are not edited through the legacy Kuula form.",
    };
  }
  const result = parseTourForm(formData);
  if (!result.success) return validationState(result);

  try {
    await db.tour.update({ where: { id }, data: result.data });
    redirect(`/admin/tours/${id}?saved=1`);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        error: "That slug is already in use.",
        fields: { slug: ["Choose a unique slug."] },
      };
    }
    throw error;
  }
}

export async function togglePublishedAction(
  id: string,
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  await verifyCsrf(formData);
  const current = await db.tour.findUniqueOrThrow({ where: { id } });
  if (!current.published && current.provider === "venviewer-native") {
    const full = await db.tour.findUnique({
      where: { id },
      include: tourViewerInclude,
    });
    if (!full || !nativeTourIsPublishable(full)) {
      redirect(`/admin/tours/${id}?error=native-unpublished`);
      return;
    }
  }
  await db.tour.update({
    where: { id },
    data: { published: !current.published },
  });
  redirect("/admin/tours");
}

export async function deleteTourAction(
  id: string,
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  await verifyCsrf(formData);
  if (formData.get("confirm") !== "delete") {
    throw new Error("Deletion was not confirmed.");
  }
  await db.tour.delete({ where: { id } });
  redirect("/admin/tours");
}
