import { describe, expect, it } from "vitest";
import {
  buildFrameAncestorsDirective,
  domainMatchesPattern,
  extractReferrerDomain,
  isDomainAllowed,
  isEmbedAllowedForTour,
  normalizeDomain,
} from "@/lib/embed/policy";

describe("embed policy", () => {
  it("allows any domain policy", () => {
    expect(isDomainAllowed("customer.com", "any", [], [])).toBe(true);
  });

  it("blocks disabled policy", () => {
    expect(isDomainAllowed("venview.co", "disabled", [], ["venview.co"])).toBe(
      false,
    );
  });

  it("allows venview domains only", () => {
    expect(
      isDomainAllowed(
        "www.venview.co",
        "venview_only",
        [],
        ["venview.co", "www.venview.co"],
      ),
    ).toBe(true);
    expect(
      isDomainAllowed("customer.com", "venview_only", [], ["venview.co"]),
    ).toBe(false);
  });

  it("allows approved domains", () => {
    expect(
      isDomainAllowed(
        "listings.customer.com",
        "approved_domains",
        ["customer.com"],
        [],
      ),
    ).toBe(true);
    expect(
      isDomainAllowed("other.com", "approved_domains", ["customer.com"], []),
    ).toBe(false);
  });

  it("matches wildcard domains", () => {
    expect(domainMatchesPattern("app.wixsite.com", "*.wixsite.com")).toBe(true);
  });

  it("extracts referrer domain", () => {
    expect(extractReferrerDomain("https://www.venview.co/listings/123")).toBe(
      "www.venview.co",
    );
  });

  it("builds frame ancestors for approved domains", () => {
    const directive = buildFrameAncestorsDirective(
      "approved_domains",
      ["customer.com"],
      [],
      "https://tour.venview.co",
    );
    expect(directive).toContain("customer.com");
  });

  it("evaluates tour embed access", () => {
    expect(
      isEmbedAllowedForTour({
        embedPolicy: "venview_only",
        embedAllowedDomains: [],
        referrerDomain: "venview.co",
        venviewDomains: ["venview.co"],
      }),
    ).toBe(true);
  });

  it("normalizes domains", () => {
    expect(normalizeDomain("https://Tour.Venview.Co/path")).toBe(
      "tour.venview.co",
    );
  });
});
