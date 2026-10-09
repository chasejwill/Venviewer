import { db } from "@/lib/db";
import { embedSlugFromPath, frameAncestorsForTour } from "@/lib/embed/enforce";

/**
 * Reads the tour policy for the embed response CSP. A lookup failure keeps
 * `frame-ancestors *`, which is how every embed framed before this column
 * existed, so a database blip does not take published embeds offline.
 */
export async function frameAncestorsForEmbedPath(
  pathname: string,
  selfOrigin: string,
): Promise<string> {
  const slug = embedSlugFromPath(pathname);
  if (!slug) return "*";
  try {
    const tour = await db.tour.findUnique({
      where: { slug },
      select: { embedPolicy: true, embedAllowedDomains: true },
    });
    if (!tour) return "*";
    return frameAncestorsForTour(tour, selfOrigin);
  } catch {
    return "*";
  }
}
