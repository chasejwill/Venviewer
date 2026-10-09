import { createHmac, timingSafeEqual } from "node:crypto";
import type { AssetVariantKind, DeliveryTokenPurpose } from "./types";

export type { DeliveryTokenPurpose };

export interface DeliveryTokenPayload {
  assetId: string;
  variant: AssetVariantKind;
  organizationId: string;
  expiresAt: number;
  purpose: DeliveryTokenPurpose;
}

export function createDeliveryToken(
  payload: DeliveryTokenPayload,
  secret: string,
): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
}

export function verifyDeliveryToken(
  token: string,
  secret: string,
): DeliveryTokenPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = createHmac("sha256", secret)
    .update(body)
    .digest("base64url");
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    sigBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as DeliveryTokenPayload;
    if (
      !payload.assetId ||
      !payload.variant ||
      !payload.organizationId ||
      !payload.expiresAt ||
      !payload.purpose
    ) {
      return null;
    }
    if (Date.now() > payload.expiresAt) return null;
    return payload;
  } catch {
    return null;
  }
}

export function deliveryTokenTtlMs(): number {
  return 15 * 60 * 1000;
}
