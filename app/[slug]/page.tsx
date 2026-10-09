import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AnalyticsBeacon } from "@/components/AnalyticsBeacon";
import { TourViewer } from "@/components/TourViewer";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { presentTour, tourViewerInclude } from "@/lib/providers/present";

type Props = { params: Promise<{ slug: string }> };

async function findTour(slug: string) {
  return db.tour.findUnique({ where: { slug }, include: tourViewerInclude });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tour = await findTour(slug);
  if (!tour) notFound();
  const description = tour.published
    ? `Explore ${tour.title} in an interactive virtual tour.`
    : "This virtual tour is not currently available.";

  return {
    title: tour.title,
    description,
    alternates: {
      canonical: new URL(`/${slug}`, getEnv().VENVIEWER_LITE_BASE_URL),
    },
    robots: tour.published ? undefined : { index: false, follow: false },
  };
}

export default async function PublicTourPage({ params }: Props) {
  const tour = await findTour((await params).slug);
  if (!tour) notFound();
  if (!tour.published) {
    return (
      <main className="public-tour-page">
        <header className="public-title-header">
          <h1>{tour.title}</h1>
        </header>
        <section className="public-unavailable" aria-labelledby="tour-status">
          <p id="tour-status">This tour is not currently available.</p>
        </section>
      </main>
    );
  }

  const presentation = presentTour(tour);
  if (!presentation.ok) {
    return (
      <main className="public-tour-page">
        <header className="public-title-header">
          <h1>{tour.title}</h1>
        </header>
        <section className="public-unavailable" aria-labelledby="tour-status">
          <p id="tour-status">{presentation.message}</p>
        </section>
      </main>
    );
  }

  if (presentation.provider === "legacy-kuula") {
    return (
      <main className="public-tour-page">
        <header className="public-title-header">
          <h1>{tour.title}</h1>
        </header>
        <AnalyticsBeacon tourId={tour.id} type="viewer_load" surface="viewer" />
        <TourViewer presentation={presentation} surface="public" />
      </main>
    );
  }

  return (
    <main className="public-tour-page native-tour-page">
      <AnalyticsBeacon tourId={tour.id} type="viewer_load" surface="viewer" />
      <TourViewer presentation={presentation} surface="public" />
    </main>
  );
}
