import { describe, expect, it } from "vitest";
import {
  credentialsAreValid,
  isAllowedCsrfOrigin,
  signSession,
  verifySession,
} from "@/lib/auth";

const secret = "a-secure-session-secret-that-is-long-enough";

describe("authentication and sessions", () => {
  it("verifies the configured email and password", async () => {
    const password = "correct-password";
    await expect(
      credentialsAreValid(
        "ADMIN@example.com",
        password,
        "admin@example.com",
        password,
      ),
    ).resolves.toBe(true);
    await expect(
      credentialsAreValid(
        "admin@example.com",
        "wrong-password",
        "admin@example.com",
        password,
      ),
    ).resolves.toBe(false);
    await expect(
      credentialsAreValid(
        "admin@example.com",
        "nope",
        "admin@example.com",
        password,
      ),
    ).resolves.toBe(false);
    await expect(
      credentialsAreValid(
        "other@example.com",
        password,
        "admin@example.com",
        password,
      ),
    ).resolves.toBe(false);
  });

  it("accepts a valid signed unexpired session", () => {
    const token = signSession(
      { email: "admin@example.com", expiresAt: 2_000 },
      secret,
    );
    expect(verifySession(token, secret, 1_000)).toEqual({
      email: "admin@example.com",
      expiresAt: 2_000,
    });
  });

  it("rejects expired, tampered, and absent sessions", () => {
    const token = signSession(
      { email: "admin@example.com", expiresAt: 2_000 },
      secret,
    );
    expect(verifySession(token, secret, 2_000)).toBeNull();
    expect(verifySession(`${token}x`, secret, 1_000)).toBeNull();
    expect(verifySession(undefined, secret, 1_000)).toBeNull();
  });

  it("accepts only the configured origin or a constrained Vercel preview", () => {
    expect(
      isAllowedCsrfOrigin("http://localhost:3000", "http://localhost:3000", {
        isVercel: false,
        forwardedHost: null,
        forwardedProto: null,
      }),
    ).toBe(true);
    expect(
      isAllowedCsrfOrigin("https://attacker.example", "https://app.example", {
        isVercel: true,
        forwardedHost: "attacker.example",
        forwardedProto: "https",
      }),
    ).toBe(false);
    expect(
      isAllowedCsrfOrigin(
        "https://venviewer-git-main.vercel.app",
        "https://app.example",
        {
          isVercel: true,
          forwardedHost: "venviewer-git-main.vercel.app",
          forwardedProto: "https",
        },
      ),
    ).toBe(true);
  });
});
