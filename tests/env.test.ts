import { describe, expect, it } from "vitest";
import { getAdminPassword, validateEnv } from "@/lib/env";

const valid = {
  DATABASE_URL: "file:./dev.db",
  VENVIEWER_LITE_BASE_URL: "http://localhost:3000",
  VENVIEWER_LITE_ADMIN_EMAIL: "admin@venviewer.test",
  VENVIEWER_LITE_ADMIN_PASSWORD: "correct-password",
  VENVIEWER_LITE_SESSION_SECRET: "12345678901234567890123456789012",
  VENVIEWER_LITE_DEPLOY_ENV: "test",
  NODE_ENV: "test",
};

describe("environment validation", () => {
  it("accepts complete secure configuration", () => {
    expect(validateEnv(valid).VENVIEWER_LITE_BASE_URL).toBe(
      "http://localhost:3000",
    );
  });

  it.each([
    "DATABASE_URL",
    "VENVIEWER_LITE_BASE_URL",
    "VENVIEWER_LITE_ADMIN_EMAIL",
    "VENVIEWER_LITE_SESSION_SECRET",
    "VENVIEWER_LITE_DEPLOY_ENV",
  ])("rejects missing %s", (key) => {
    expect(() => validateEnv({ ...valid, [key]: undefined })).toThrow();
  });

  it("rejects invalid email, short password, secret, and base URL", () => {
    expect(() =>
      validateEnv({ ...valid, VENVIEWER_LITE_ADMIN_EMAIL: "not-an-email" }),
    ).toThrow();
    expect(() =>
      getAdminPassword({
        ...valid,
        VENVIEWER_LITE_ADMIN_PASSWORD: "short-pass",
      }),
    ).toThrow();
    expect(
      getAdminPassword({
        ...valid,
        VENVIEWER_LITE_ADMIN_PASSWORD: "123456789012",
      }),
    ).toBe("123456789012");
    expect(() =>
      getAdminPassword({
        ...valid,
        VENVIEWER_LITE_ADMIN_PASSWORD: undefined,
      }),
    ).toThrow();
    expect(() =>
      validateEnv({ ...valid, VENVIEWER_LITE_SESSION_SECRET: "short" }),
    ).toThrow();
    expect(() =>
      validateEnv({
        ...valid,
        VENVIEWER_LITE_BASE_URL: "https://app.example/a-path",
      }),
    ).toThrow();
  });

  it("rejects missing production configuration", () => {
    expect(() =>
      validateEnv({
        ...valid,
        VENVIEWER_LITE_DEPLOY_ENV: "production",
        VENVIEWER_LITE_SESSION_SECRET: undefined,
      }),
    ).toThrow();
  });

  it("loads page configuration when the admin password is absent", () => {
    expect(
      validateEnv({ ...valid, VENVIEWER_LITE_ADMIN_PASSWORD: undefined })
        .VENVIEWER_LITE_ADMIN_EMAIL,
    ).toBe("admin@venviewer.test");
  });

  it("rejects a placeholder admin password in production", () => {
    expect(() =>
      getAdminPassword({
        ...valid,
        VENVIEWER_LITE_DEPLOY_ENV: "production",
        VENVIEWER_LITE_ADMIN_PASSWORD: "replace-with-a-long-password",
      }),
    ).toThrow(/VENVIEWER_LITE_ADMIN_PASSWORD/);
  });

  it("rejects documented placeholders in production", () => {
    expect(() =>
      validateEnv({
        ...valid,
        VENVIEWER_LITE_DEPLOY_ENV: "production",
        VENVIEWER_LITE_BASE_URL: "https://example.com",
        VENVIEWER_LITE_ADMIN_EMAIL: "admin@example.com",
        VENVIEWER_LITE_SESSION_SECRET:
          "replace-with-at-least-32-random-characters",
      }),
    ).toThrow(/placeholder/i);
  });
});
