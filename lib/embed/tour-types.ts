export type TourProviderType = "kuula" | "venviewer" | "matterport" | "custom";

export type TourStatus = "draft" | "published" | "archived";

export type EmbedPolicy =
  "disabled" | "any" | "venview_only" | "approved_domains";

export interface TourBranding {
  logoUrl?: string | null;
  logoAssetId?: string | null;
  accentColor?: string | null;
}

export interface Tour {
  id: string;
  organizationId: string | null;
  title: string;
  slug: string;
  description: string | null;
  provider: TourProviderType;
  providerTourId: string | null;
  providerEmbedUrl: string | null;
  providerMetadata: Record<string, unknown> | null;
  status: TourStatus;
  publicViewerUrl: string | null;
  embedUrl: string | null;
  primaryCtaLabel: string | null;
  primaryCtaUrl: string | null;
  secondaryCtaLabel: string | null;
  secondaryCtaUrl: string | null;
  showPoweredByVenview: boolean;
  branding: TourBranding | null;
  embedPolicy: EmbedPolicy;
  embedAllowedDomains: string[];
  integrationEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  archivedAt: string | null;
}

export interface CreateTourInput {
  title: string;
  slug?: string;
  description?: string | null;
  organizationId?: string | null;
  provider?: TourProviderType;
  providerTourId?: string | null;
  providerEmbedUrl?: string | null;
  providerMetadata?: Record<string, unknown> | null;
  status?: TourStatus;
  primaryCtaLabel?: string | null;
  primaryCtaUrl?: string | null;
  secondaryCtaLabel?: string | null;
  secondaryCtaUrl?: string | null;
  showPoweredByVenview?: boolean;
  branding?: TourBranding | null;
  embedPolicy?: EmbedPolicy;
  embedAllowedDomains?: string[];
  integrationEnabled?: boolean;
}

export interface UpdateTourInput {
  title?: string;
  slug?: string;
  description?: string | null;
  organizationId?: string | null;
  provider?: TourProviderType;
  providerTourId?: string | null;
  providerEmbedUrl?: string | null;
  providerMetadata?: Record<string, unknown> | null;
  status?: TourStatus;
  primaryCtaLabel?: string | null;
  primaryCtaUrl?: string | null;
  secondaryCtaLabel?: string | null;
  secondaryCtaUrl?: string | null;
  showPoweredByVenview?: boolean;
  branding?: TourBranding | null;
  embedPolicy?: EmbedPolicy;
  embedAllowedDomains?: string[];
  integrationEnabled?: boolean;
}

export interface TourAnalyticsSnapshot {
  tourId: string;
  views: number;
  uniqueViews: number;
  embedViews: number;
  lastViewedAt: string | null;
  updatedAt: string;
}

export type TourAnalyticsEventType =
  | "viewer_load"
  | "tour_view"
  | "cta_click"
  | "embed_load"
  | "fullscreen_enter"
  | "provider_error";

export type TourAnalyticsSurface = "viewer" | "embed" | "preview" | "dashboard";

export interface TourAnalyticsEvent {
  type: TourAnalyticsEventType;
  tourId: string;
  surface?: TourAnalyticsSurface;
  metadata?: Record<string, unknown>;
  occurredAt: string;
}

export interface TourListFilters {
  status?: TourStatus;
  provider?: TourProviderType;
  organizationId?: string;
  search?: string;
  includeArchived?: boolean;
}

export interface TourUrls {
  publicViewerUrl: string;
  embedUrl: string;
}

export interface EmbedCodeOptions {
  width?: string | number;
  height?: string | number;
  allowFullscreen?: boolean;
  title?: string;
  lazy?: boolean;
  responsive?: boolean;
}

export interface ProviderRenderConfig {
  iframeSrc: string;
  provider: TourProviderType;
  providerTourId: string | null;
}

export interface TourProvider {
  readonly type: TourProviderType;
  readonly name: string;
  validateEmbedUrl(url: string): boolean;
  extractTourId(url: string): string | null;
  normalizeEmbedUrl(url: string, metadata?: Record<string, unknown>): string;
  getEmbedIframeSrc(url: string, metadata?: Record<string, unknown>): string;
}

export interface TourProviderRegistry {
  get(type: TourProviderType): TourProvider;
  list(): TourProvider[];
  validate(type: TourProviderType, embedUrl: string): boolean;
}
