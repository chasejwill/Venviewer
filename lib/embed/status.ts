import type { Tour, TourStatus } from "./tour-types";

export function isTourPublished(status: TourStatus): boolean {
  return status === "published";
}

export function isTourArchived(status: TourStatus): boolean {
  return status === "archived";
}

export function isTourPubliclyAccessible(tour: Pick<Tour, "status">): boolean {
  return tour.status === "published";
}

export function canTransitionTourStatus(
  current: TourStatus,
  next: TourStatus,
): boolean {
  if (current === next) return true;
  if (current === "archived" && next === "published") return false;
  return true;
}

export function statusLabel(status: TourStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "published":
      return "Published";
    case "archived":
      return "Archived";
  }
}
