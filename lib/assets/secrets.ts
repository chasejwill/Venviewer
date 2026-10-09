const PLACEHOLDER_PATTERN =
  /(?:replace[-_ ]?with|change[-_ ]?me|placeholder|example\.com)/i;

export function readDeliverySecret(
  env: Record<string, string | undefined> = process.env,
): string {
  const secret = env.VENVIEWER_DELIVERY_SECRET?.trim() ?? "";
  if (secret.length < 32) {
    throw new Error(
      "VENVIEWER_DELIVERY_SECRET must be at least 32 characters.",
    );
  }
  if (
    env.VENVIEWER_LITE_DEPLOY_ENV === "production" &&
    PLACEHOLDER_PATTERN.test(secret)
  ) {
    throw new Error(
      "VENVIEWER_DELIVERY_SECRET cannot use a documented placeholder in production.",
    );
  }
  return secret;
}
