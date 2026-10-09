import {
  buildFrameAncestorsDirective,
  extractReferrerDomain,
  isEmbedAllowedForTour,
  parseEmbedAllowedDomains,
} from "@/lib/embed/policy";
import type { EmbedPolicy } from "@/lib/embed/tour-types";
import { VENVIEW_EMBED_DOMAINS } from "@/lib/embed/hosts";

/**
 * Missing policy means an existing row from before this column existed, or a
 * fixture that has not set one. Those keep today's open embed behavior.
 * An unrecognized stored value fails closed.
 */
export function readStoredEmbedPolicy(
  value: string | null | undefined,
): EmbedPolicy {
  if (value == null || value === "") return "any";
  if (
    value === "disabled" ||
    value === "any" ||
    value === "venview_only" ||
    value === "approved_domains"
  ) {
    return value;
  }
  return "disabled";
}

export function isTourEmbeddable(
  tour: {
    embedPolicy?: string | null;
    embedAllowedDomains?: string | null;
  },
  referrer: string | null | undefined,
): boolean {
  return isEmbedAllowedForTour({
    embedPolicy: readStoredEmbedPolicy(tour.embedPolicy),
    embedAllowedDomains: parseEmbedAllowedDomains(tour.embedAllowedDomains),
    referrerDomain: extractReferrerDomain(referrer),
    venviewDomains: [...VENVIEW_EMBED_DOMAINS],
  });
}

export function frameAncestorsForTour(
  tour: {
    embedPolicy?: string | null;
    embedAllowedDomains?: string | null;
  },
  selfOrigin: string,
): string {
  return buildFrameAncestorsDirective(
    readStoredEmbedPolicy(tour.embedPolicy),
    parseEmbedAllowedDomains(tour.embedAllowedDomains),
    [...VENVIEW_EMBED_DOMAINS],
    selfOrigin,
  );
}

export function embedSlugFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 2 && parts[0] === "embed") return parts[1] ?? null;
  return null;
}
