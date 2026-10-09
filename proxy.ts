import { NextRequest, NextResponse } from "next/server";
import {
  CSRF_COOKIE,
  newCsrfToken,
  SESSION_COOKIE,
  verifySession,
} from "@/lib/auth";
import { frameAncestorsForEmbedPath } from "@/lib/embed/request-policy";
import { getEnv } from "@/lib/env";

function applyResponseSecurity(
  response: NextResponse,
  {
    csp,
    frameAncestors,
    existingCsrfToken,
    csrfToken,
  }: {
    csp: string;
    frameAncestors: string;
    existingCsrfToken: string | undefined;
    csrfToken: string;
  },
): NextResponse {
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  if (frameAncestors === "'none'") {
    response.headers.set("X-Frame-Options", "DENY");
  }

  if (!existingCsrfToken) {
    response.cookies.set(CSRF_COOKIE, csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const existingCsrfToken = request.cookies.get(CSRF_COOKIE)?.value;
  const csrfToken = existingCsrfToken ?? newCsrfToken();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-csrf-token", csrfToken);

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isEmbed = request.nextUrl.pathname.startsWith("/embed/");
  const frameAncestors = isEmbed
    ? await frameAncestorsForEmbedPath(
        request.nextUrl.pathname,
        getEnv().VENVIEWER_LITE_BASE_URL,
      )
    : "'none'";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-src https://kuula.co https://www.kuula.co",
    `frame-ancestors ${frameAncestors}`,
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);
  const isProtectedAdminPath =
    (request.nextUrl.pathname === "/admin" ||
      request.nextUrl.pathname.startsWith("/admin/")) &&
    request.nextUrl.pathname !== "/admin/login";
  if (isProtectedAdminPath) {
    const env = getEnv();
    const session = verifySession(
      request.cookies.get(SESSION_COOKIE)?.value,
      env.VENVIEWER_LITE_SESSION_SECRET,
    );
    if (!session) {
      return applyResponseSecurity(
        NextResponse.redirect(new URL("/admin/login", request.url)),
        { csp, frameAncestors, existingCsrfToken, csrfToken },
      );
    }
  }

  return applyResponseSecurity(
    NextResponse.next({ request: { headers: requestHeaders } }),
    { csp, frameAncestors, existingCsrfToken, csrfToken },
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
