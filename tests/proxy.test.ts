import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE, signSession } from "@/lib/auth";
import { resetEnvCacheForTests } from "@/lib/env";
import { proxy } from "@/proxy";

const secret = "proxy-test-session-secret-at-least-32-characters";

function request(path: string, session?: string) {
  return new NextRequest(`https://viewer.example${path}`, {
    headers: session ? { cookie: `${SESSION_COOKIE}=${session}` } : undefined,
  });
}

describe("admin proxy authorization", () => {
  beforeEach(() => {
    process.env.DATABASE_URL =
      "postgresql://user:pass@localhost:5432/venviewer";
    process.env.VENVIEWER_LITE_BASE_URL = "https://viewer.example";
    process.env.VENVIEWER_LITE_ADMIN_EMAIL = "admin@viewer.example";
    process.env.VENVIEWER_LITE_ADMIN_PASSWORD = "correct-password";
    process.env.VENVIEWER_LITE_SESSION_SECRET = secret;
    process.env.VENVIEWER_LITE_DEPLOY_ENV = "test";
    resetEnvCacheForTests();
  });

  it("allows exactly the admin login path without a session", () => {
    const response = proxy(request("/admin/login"));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("denies framing for public tours", () => {
    const response = proxy(request("/falls"));
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("content-security-policy")).toContain(
      "frame-ancestors 'none'",
    );
  });

  it("preserves frame-compatible headers only for embed tours", () => {
    const response = proxy(request("/embed/falls"));
    expect(response.headers.has("x-frame-options")).toBe(false);
    expect(response.headers.get("content-security-policy")).toContain(
      "frame-ancestors *",
    );
  });

  it("redirects a protected admin path when the cookie is missing", () => {
    const response = proxy(request("/admin/tours"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://viewer.example/admin/login",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it.each([
    ["invalid", "not-a-session"],
    [
      "expired",
      signSession(
        { email: "admin@viewer.example", expiresAt: Date.now() - 1 },
        secret,
      ),
    ],
  ])("redirects a protected path with an %s session", (_name, session) => {
    const response = proxy(request("/admin/tours", session));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://viewer.example/admin/login",
    );
  });

  it("passes a protected path with a valid session", () => {
    const session = signSession(
      {
        email: "admin@viewer.example",
        expiresAt: Date.now() + 60_000,
      },
      secret,
    );
    const response = proxy(request("/admin/tours", session));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
