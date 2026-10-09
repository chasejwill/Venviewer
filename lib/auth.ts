import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { compare } from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getEnv } from "@/lib/env";

export const SESSION_COOKIE = "venviewer_session";
export const CSRF_COOKIE = "venviewer_csrf";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

type SessionPayload = {
  email: string;
  expiresAt: number;
};

function equal(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function signature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signSession(payload: SessionPayload, secret: string): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded, secret)}`;
}

export function verifySession(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): SessionPayload | null {
  if (!token) return null;
  const [encoded, suppliedSignature, extra] = token.split(".");
  if (!encoded || !suppliedSignature || extra) return null;
  if (!equal(signature(encoded, secret), suppliedSignature)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (
      typeof payload.email !== "string" ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= now
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function credentialsAreValid(
  email: string,
  password: string,
  expectedEmail: string,
  expectedPasswordHash: string,
): Promise<boolean> {
  const emailMatches = equal(email.toLowerCase(), expectedEmail.toLowerCase());
  const passwordMatches = await compare(password, expectedPasswordHash);
  return emailMatches && passwordMatches;
}

export async function createSession(): Promise<void> {
  const env = getEnv();
  const value = signSession(
    {
      email: env.VENVIEWER_LITE_ADMIN_EMAIL,
      expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    },
    env.VENVIEWER_LITE_SESSION_SECRET,
  );
  (await cookies()).set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const env = getEnv();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token, env.VENVIEWER_LITE_SESSION_SECRET);
}

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function getCsrfToken(): Promise<string> {
  const store = await cookies();
  const token =
    store.get(CSRF_COOKIE)?.value ?? (await headers()).get("x-csrf-token");
  if (!token) throw new Error("CSRF token is unavailable.");
  return token;
}

export async function verifyCsrf(formData: FormData): Promise<void> {
  const supplied = formData.get("csrf");
  const expected = (await cookies()).get(CSRF_COOKIE)?.value;
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const env = getEnv();
  const originMatches = isAllowedCsrfOrigin(
    origin,
    env.VENVIEWER_LITE_BASE_URL,
    {
      isVercel: process.env.VERCEL === "1",
      forwardedHost: requestHeaders.get("x-forwarded-host"),
      forwardedProto: requestHeaders.get("x-forwarded-proto"),
    },
  );

  if (
    typeof supplied !== "string" ||
    !expected ||
    !equal(supplied, expected) ||
    !originMatches
  ) {
    throw new Error("Invalid request.");
  }
}

export function isAllowedCsrfOrigin(
  suppliedOrigin: string | null,
  baseUrl: string,
  forwarded: {
    isVercel: boolean;
    forwardedHost: string | null;
    forwardedProto: string | null;
  },
): boolean {
  if (!suppliedOrigin) return false;
  try {
    const origin = new URL(suppliedOrigin).origin;
    if (origin === new URL(baseUrl).origin) return true;

    const host = forwarded.forwardedHost?.toLowerCase();
    return Boolean(
      forwarded.isVercel &&
      forwarded.forwardedProto === "https" &&
      host &&
      !host.includes(",") &&
      /^[a-z0-9-]+(?:-[a-z0-9-]+)*\.vercel\.app$/.test(host) &&
      origin === `https://${host}`,
    );
  } catch {
    return false;
  }
}

export function newCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

export class AdminAuthError extends Error {
  readonly status: 401 | 403;

  constructor(message: string, status: 401 | 403) {
    super(message);
    this.name = "AdminAuthError";
    this.status = status;
  }
}

/** Session plus CSRF, for admin form posts to route handlers. */
export async function authorizeAdminForm(
  formData: FormData,
): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new AdminAuthError("Authentication required.", 401);
  }
  try {
    await verifyCsrf(formData);
  } catch {
    throw new AdminAuthError("Invalid request.", 403);
  }
  return session;
}

/** Session plus CSRF header, for admin API calls that are not HTML forms. */
export async function authorizeAdminHeader(
  request: Request,
): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new AdminAuthError("Authentication required.", 401);
  }
  const supplied = request.headers.get("x-csrf-token");
  const expected = (await cookies()).get(CSRF_COOKIE)?.value;
  const requestHeaders = await headers();
  const env = getEnv();
  const originMatches = isAllowedCsrfOrigin(
    request.headers.get("origin") ?? requestHeaders.get("origin"),
    env.VENVIEWER_LITE_BASE_URL,
    {
      isVercel: process.env.VERCEL === "1",
      forwardedHost: requestHeaders.get("x-forwarded-host"),
      forwardedProto: requestHeaders.get("x-forwarded-proto"),
    },
  );
  if (!supplied || !expected || !equal(supplied, expected) || !originMatches) {
    throw new AdminAuthError("Invalid request.", 403);
  }
  return session;
}
