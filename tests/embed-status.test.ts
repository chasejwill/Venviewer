import { describe, expect, it } from "vitest";
import {
  canTransitionTourStatus,
  isTourPubliclyAccessible,
  isTourPublished,
  statusLabel,
} from "@/lib/embed/status";

describe("publishing access", () => {
  it("allows only published tours to be public", () => {
    expect(isTourPubliclyAccessible({ status: "published" })).toBe(true);
    expect(isTourPubliclyAccessible({ status: "draft" })).toBe(false);
    expect(isTourPubliclyAccessible({ status: "archived" })).toBe(false);
  });

  it("derives publish state from status", () => {
    expect(isTourPublished("published")).toBe(true);
    expect(isTourPublished("draft")).toBe(false);
  });

  it("labels each status and blocks archived to published", () => {
    expect(statusLabel("archived")).toBe("Archived");
    expect(canTransitionTourStatus("archived", "published")).toBe(false);
    expect(canTransitionTourStatus("archived", "draft")).toBe(true);
  });
});
