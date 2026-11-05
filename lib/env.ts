import { z } from "zod";

const PLACEHOLDER_PATTERN =
  /(?:replace[-_ ]?with|change[-_ ]?me|placeholder|example\.com)/i;

const baseUrlSchema = z
  .url("VENVIEWER_LITE_BASE_URL must be an absolute URL.")
  .transform((value, context) => {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      context.addIssue({
        code: "custom",
        message: "VENVIEWER_LITE_BASE_URL must contain only an HTTP(S) origin.",
      });
      return z.NEVER;
    }
    return url.origin;
  });

const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1),
    VENVIEWER_LITE_BASE_URL: baseUrlSchema,
    VENVIEWER_LITE_ADMIN_EMAIL: z.email(),
    VENVIEWER_LITE_SESSION_SECRET: z.string().min(32),
    VENVIEWER_LITE_DEPLOY_ENV: z.enum(["development", "test", "production"]),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  })
  .superRefine((env, context) => {
    if (env.VENVIEWER_LITE_DEPLOY_ENV !== "production") return;

    const protectedValues = [
      ["VENVIEWER_LITE_BASE_URL", env.VENVIEWER_LITE_BASE_URL],
      ["VENVIEWER_LITE_ADMIN_EMAIL", env.VENVIEWER_LITE_ADMIN_EMAIL],
      ["VENVIEWER_LITE_SESSION_SECRET", env.VENVIEWER_LITE_SESSION_SECRET],
    ] as const;
    for (const [name, value] of protectedValues) {
      if (PLACEHOLDER_PATTERN.test(value)) {
        context.addIssue({
          code: "custom",
          path: [name],
          message: `${name} cannot use a documented placeholder in production.`,
        });
      }
    }
  });

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | undefined;

export function getEnv(): AppEnv {
  if (!cached) {
    cached = envSchema.parse(process.env);
  }
  return cached;
}

const adminPasswordSchema = z
  .string()
  .min(12, "Must be at least 12 characters.");

export function validateEnv(input: Record<string, string | undefined>): AppEnv {
  return envSchema.parse(input);
}

export function getAdminPassword(
  input: Record<string, string | undefined> = process.env,
): string {
  const password = adminPasswordSchema.parse(
    input.VENVIEWER_LITE_ADMIN_PASSWORD,
  );
  if (
    input.VENVIEWER_LITE_DEPLOY_ENV === "production" &&
    PLACEHOLDER_PATTERN.test(password)
  ) {
    throw new Error(
      "VENVIEWER_LITE_ADMIN_PASSWORD cannot use a documented placeholder in production.",
    );
  }
  return password;
}

export function resetEnvCacheForTests(): void {
  cached = undefined;
}
