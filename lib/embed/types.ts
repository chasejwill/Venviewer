import type { EmbedPolicy } from "./tour-types";

export const EMBED_POLICIES = [
  "disabled",
  "any",
  "venview_only",
  "approved_domains",
] as const;

export interface VenviewerIntegrationPayload {
  venviewerTourId: string;
  venviewerSlug: string;
  venviewerEmbedUrl: string;
  venviewerPublicViewerUrl: string;
  tourEnabled: boolean;
  embedPolicy: EmbedPolicy;
  provider: string;
  title: string;
  status: string;
}
