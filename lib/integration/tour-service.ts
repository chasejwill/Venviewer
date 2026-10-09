import {
  parseEmbedAllowedDomains,
  serializeEmbedAllowedDomains,
} from "@/lib/embed/policy";
import type { VenviewerIntegrationPayload } from "@/lib/embed/types";
import type {
  EmbedCodeOptions,
  EmbedPolicy,
  Tour,
} from "@/lib/embed/tour-types";

export function generateEmbedCode(
  embedUrl: string,
  options: EmbedCodeOptions = {},
): string {
  const width = options.width ?? "100%";
  const height = options.height ?? 600;
  const allowFullscreen = options.allowFullscreen ?? true;
  const title = options.title ?? "Venview virtual tour";
  const loading = options.lazy === false ? "eager" : "lazy";
  const fullscreenAttrs = allowFullscreen
    ? 'allow="fullscreen"\n  allowfullscreen'
    : "";

  if (options.responsive === false) {
    return `<iframe
  src="${embedUrl}"
  title="${title.replace(/"/g, "&quot;")}"
  width="${width}"
  height="${height}"
  frameborder="0"
  loading="${loading}"
  ${fullscreenAttrs}>
</iframe>`;
  }

  return `<div style="position:relative;width:100%;max-width:100%;overflow:hidden;">
  <div style="position:relative;padding-bottom:56.25%;height:0;">
    <iframe
      src="${embedUrl}"
      title="${title.replace(/"/g, "&quot;")}"
      style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"
      loading="${loading}"
      ${allowFullscreen ? 'allow="fullscreen"\n      allowfullscreen' : ""}
    ></iframe>
  </div>
</div>`;
}

export function normalizeEmbedPolicy(
  value: EmbedPolicy | undefined,
): EmbedPolicy {
  if (
    value === "disabled" ||
    value === "any" ||
    value === "venview_only" ||
    value === "approved_domains"
  ) {
    return value;
  }
  return "any";
}

export function normalizeEmbedAllowedDomains(
  domains: string[] | undefined,
): string[] {
  return parseEmbedAllowedDomains(
    serializeEmbedAllowedDomains(domains ?? []) ?? "[]",
  );
}

export function buildVenviewerIntegrationPayload(
  tour: Tour,
): VenviewerIntegrationPayload {
  const tourEnabled =
    tour.status === "published" &&
    tour.integrationEnabled &&
    tour.embedPolicy !== "disabled";

  return {
    venviewerTourId: tour.id,
    venviewerSlug: tour.slug,
    venviewerEmbedUrl: tour.embedUrl ?? "",
    venviewerPublicViewerUrl: tour.publicViewerUrl ?? "",
    tourEnabled,
    embedPolicy: tour.embedPolicy,
    provider: tour.provider,
    title: tour.title,
    status: tour.status,
  };
}
