import type { EmbedPolicy } from "./tour-types";

export function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

export function parseEmbedAllowedDomains(
  raw: string | null | undefined,
): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is string => typeof entry === "string")
      .map(normalizeDomain)
      .filter(Boolean);
  } catch {
    return raw.split(",").map(normalizeDomain).filter(Boolean);
  }
}

export function serializeEmbedAllowedDomains(domains: string[]): string | null {
  const normalized = [...new Set(domains.map(normalizeDomain).filter(Boolean))];
  if (normalized.length === 0) return null;
  return JSON.stringify(normalized);
}

export function domainMatchesPattern(domain: string, pattern: string): boolean {
  const normalizedDomain = normalizeDomain(domain);
  const normalizedPattern = normalizeDomain(pattern);
  if (normalizedDomain === normalizedPattern) return true;
  if (normalizedPattern.startsWith("*.")) {
    const suffix = normalizedPattern.slice(1);
    return (
      normalizedDomain.endsWith(suffix) ||
      normalizedDomain === normalizedPattern.slice(2)
    );
  }
  return normalizedDomain.endsWith(`.${normalizedPattern}`);
}

export function isDomainAllowed(
  referrerDomain: string | null,
  policy: EmbedPolicy,
  allowedDomains: string[],
  venviewDomains: string[],
): boolean {
  if (policy === "disabled") return false;
  if (policy === "any") return true;
  if (!referrerDomain) {
    // Direct navigation to embed URL — allow for public link use; framing still uses CSP.
    return policy !== "approved_domains";
  }

  const domain = normalizeDomain(referrerDomain);

  if (policy === "venview_only") {
    return venviewDomains.some((entry) => domainMatchesPattern(domain, entry));
  }

  if (policy === "approved_domains") {
    return allowedDomains.some((entry) => domainMatchesPattern(domain, entry));
  }

  return false;
}

export function buildFrameAncestorsDirective(
  policy: EmbedPolicy,
  allowedDomains: string[],
  venviewDomains: string[],
  selfOrigin: string,
): string {
  if (policy === "disabled") {
    return "'none'";
  }

  if (policy === "any") {
    return "*";
  }

  const ancestors = new Set<string>(["'self'", selfOrigin]);
  const domains = policy === "venview_only" ? venviewDomains : allowedDomains;
  for (const domain of domains) {
    ancestors.add(`https://${normalizeDomain(domain)}`);
    ancestors.add(`http://${normalizeDomain(domain)}`);
    if (!domain.startsWith("*.")) {
      ancestors.add(`https://*.${normalizeDomain(domain)}`);
    }
  }

  return [...ancestors].join(" ");
}

export function extractReferrerDomain(
  referrer: string | null | undefined,
): string | null {
  if (!referrer?.trim()) return null;
  try {
    return normalizeDomain(new URL(referrer).hostname);
  } catch {
    return normalizeDomain(referrer);
  }
}

export function isEmbedAllowedForTour(input: {
  embedPolicy: EmbedPolicy;
  embedAllowedDomains: string[];
  referrerDomain: string | null;
  venviewDomains: string[];
}): boolean {
  return isDomainAllowed(
    input.referrerDomain,
    input.embedPolicy,
    input.embedAllowedDomains,
    input.venviewDomains,
  );
}
