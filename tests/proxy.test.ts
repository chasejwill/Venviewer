import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_COOKIE, signSession } from "@/lib/auth";
import { resetEnvCacheForTests } from "@/lib/env";

const { findUnique } = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { tour: { findUnique } },
}));

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
    process.env.VENVIEWER_LITE_ADMIN_PASSWORD_HASH =
      "$2b$04$pJN3Lr.cBFuTYl9hzXlCYunQ3PTa56wUMMAq8b5Im8qaYe2PW1O3i";
    process.env.VENVIEWER_LITE_SESSION_SECRET = secret;
    process.env.VENVIEWER_LITE_DEPLOY_ENV = "test";
    resetEnvCacheForTests();
    findUnique.mockReset();
    findUnique.mockResolvedValue(null);
  });

  it("allows exactly the admin login path without a session", async () => {
    const response = await proxy(request("/admin/login"));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("denies framing for public tours", async () => {
    const response = await proxy(request("/falls"));
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("content-security-policy")).toContain(
      "frame-ancestors 'none'",
    );
  });

  it("preserves frame-compatible headers only for embed tours", async () => {
    const response = await proxy(request("/embed/falls"));
    expect(response.headers.has("x-frame-options")).toBe(false);
    expect(response.headers.get("content-security-policy")).toContain(
      "frame-ancestors *",
    );
  });

  it("redirects a protected admin path when the cookie is missing", async () => {
    const response = await proxy(request("/admin/tours"));
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
  ])(
    "redirects a protected path with an %s session",
    async (_name, session) => {
      const response = await proxy(request("/admin/tours", session));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "https://viewer.example/admin/login",
      );
    },
  );

  it("passes a protected path with a valid session", async () => {
    const session = signSession(
      {
        email: "admin@viewer.example",
        expiresAt: Date.now() + 60_000,
      },
      secret,
    );
    const response = await proxy(request("/admin/tours", session));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("limits embed framing to Venview hosts for venview_only tours", async () => {
    findUnique.mockResolvedValue({
      embedPolicy: "venview_only",
      embedAllowedDomains: null,
    });
    const response = await proxy(request("/embed/lobby"));
    const csp = response.headers.get("content-security-policy") ?? "";
    expect(csp).toContain("frame-ancestors");
    expect(csp).toContain("https://venview.co");
    expect(csp).toContain("https://www.venview.co");
    expect(csp).toContain("https://tour.venview.co");
    expect(csp).not.toContain("frame-ancestors *");
    expect(csp).not.toContain("os.venview.co");
    expect(response.headers.has("x-frame-options")).toBe(false);
  });
});
