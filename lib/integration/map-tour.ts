import { readStoredEmbedPolicy } from "@/lib/embed/enforce";
import { parseEmbedAllowedDomains } from "@/lib/embed/policy";
import type {
  Tour,
  TourBranding,
  TourProviderType,
} from "@/lib/embed/tour-types";
import { tourSharing } from "@/lib/sharing";

export type IntegrationSourceTour = {
  id: string;
  title: string;
  slug: string;
  provider: string;
  kuulaUrl: string | null;
  published: boolean;
  embedPolicy: string;
  embedAllowedDomains: string | null;
  integrationEnabled: boolean;
  branding: string | null;
  primaryCtaLabel: string | null;
  primaryCtaUrl: string | null;
  secondaryCtaLabel: string | null;
  secondaryCtaUrl: string | null;
  showPoweredByVenview: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function mapProvider(provider: string): TourProviderType {
  if (provider === "legacy-kuula" || provider === "kuula") return "kuula";
  if (provider === "venviewer-native" || provider === "venviewer") {
    return "venviewer";
  }
  if (provider === "matterport") return "matterport";
  return "custom";
}

function parseBranding(raw: string | null): TourBranding | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<TourBranding>;
    if (!value || typeof value !== "object") return null;
    return {
      logoUrl: typeof value.logoUrl === "string" ? value.logoUrl : null,
      logoAssetId:
        typeof value.logoAssetId === "string" ? value.logoAssetId : null,
      accentColor:
        typeof value.accentColor === "string" ? value.accentColor : null,
    };
  } catch {
    return null;
  }
}

/** Maps a Lite tour onto the shape `buildVenviewerIntegrationPayload` expects. */
export function toIntegrationTour(
  tour: IntegrationSourceTour,
  baseUrl: string,
): Tour {
  const sharing = tourSharing(baseUrl, tour);
  const status = tour.published ? "published" : "draft";
  return {
    id: tour.id,
    organizationId: null,
    title: tour.title,
    slug: tour.slug,
    description: null,
    provider: mapProvider(tour.provider),
    providerTourId: null,
    providerEmbedUrl: tour.kuulaUrl,
    providerMetadata: null,
    status,
    publicViewerUrl: sharing.publicUrl,
    embedUrl: sharing.embedUrl,
    primaryCtaLabel: tour.primaryCtaLabel,
    primaryCtaUrl: tour.primaryCtaUrl,
    secondaryCtaLabel: tour.secondaryCtaLabel,
    secondaryCtaUrl: tour.secondaryCtaUrl,
    showPoweredByVenview: tour.showPoweredByVenview,
    branding: parseBranding(tour.branding),
    embedPolicy: readStoredEmbedPolicy(tour.embedPolicy),
    embedAllowedDomains: parseEmbedAllowedDomains(tour.embedAllowedDomains),
    integrationEnabled: tour.integrationEnabled,
    createdAt: tour.createdAt.toISOString(),
    updatedAt: tour.updatedAt.toISOString(),
    publishedAt: tour.published ? tour.updatedAt.toISOString() : null,
    archivedAt: null,
  };
}
