import { serializeEmbedAllowedDomains } from "@/lib/embed/policy";
import type { EmbedPolicy, TourBranding } from "@/lib/embed/tour-types";

const POLICIES = [
  "disabled",
  "any",
  "venview_only",
  "approved_domains",
] as const;

function optionalHttpUrl(
  value: FormDataEntryValue | null,
): string | null | "invalid" {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return "invalid";
    return url.toString();
  } catch {
    return "invalid";
  }
}

function optionalColor(
  value: FormDataEntryValue | null,
): string | null | "invalid" {
  if (typeof value !== "string" || !value.trim()) return null;
  const color = value.trim();
  if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) return "invalid";
  return color.toLowerCase();
}

export type EmbedSettingsInput = {
  embedPolicy: EmbedPolicy;
  embedAllowedDomains: string | null;
  integrationEnabled: boolean;
  primaryCtaLabel: string | null;
  primaryCtaUrl: string | null;
  secondaryCtaLabel: string | null;
  secondaryCtaUrl: string | null;
  showPoweredByVenview: boolean;
  branding: string | null;
};

export function parseEmbedSettings(
  formData: FormData,
): { ok: true; data: EmbedSettingsInput } | { ok: false; error: string } {
  const policy = formData.get("embedPolicy");
  if (
    typeof policy !== "string" ||
    !POLICIES.includes(policy as (typeof POLICIES)[number])
  ) {
    return { ok: false, error: "Choose an embed policy." };
  }

  const domains = serializeEmbedAllowedDomains(
    String(formData.get("embedAllowedDomains") ?? "")
      .split(/[\n,]/)
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

  const primaryCtaUrl = optionalHttpUrl(formData.get("primaryCtaUrl"));
  const secondaryCtaUrl = optionalHttpUrl(formData.get("secondaryCtaUrl"));
  const logoUrl = optionalHttpUrl(formData.get("logoUrl"));
  const accentColor = optionalColor(formData.get("accentColor"));
  if (
    primaryCtaUrl === "invalid" ||
    secondaryCtaUrl === "invalid" ||
    logoUrl === "invalid"
  ) {
    return { ok: false, error: "CTA and logo URLs must be HTTP(S) links." };
  }
  if (accentColor === "invalid") {
    return { ok: false, error: "Accent color must be a hex color." };
  }

  const label = (name: string) => {
    const value = formData.get(name);
    if (typeof value !== "string" || !value.trim()) return null;
    return value.trim().slice(0, 80);
  };

  const branding: TourBranding | null =
    logoUrl || accentColor ? { logoUrl, accentColor } : null;

  return {
    ok: true,
    data: {
      embedPolicy: policy as EmbedPolicy,
      embedAllowedDomains: domains,
      integrationEnabled: formData.get("integrationEnabled") === "on",
      primaryCtaLabel: label("primaryCtaLabel"),
      primaryCtaUrl,
      secondaryCtaLabel: label("secondaryCtaLabel"),
      secondaryCtaUrl,
      showPoweredByVenview: formData.get("showPoweredByVenview") === "on",
      branding: branding ? JSON.stringify(branding) : null,
    },
  };
}
