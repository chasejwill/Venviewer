import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AnalyticsBeacon } from "@/components/AnalyticsBeacon";
import { EmbedBlocked } from "@/components/EmbedBlocked";
import { TourViewer } from "@/components/TourViewer";
import { db } from "@/lib/db";
import { isTourEmbeddable } from "@/lib/embed/enforce";
import { presentTour, tourViewerInclude } from "@/lib/providers/present";

type Props = { params: Promise<{ slug: string }> };

async function requestReferrer(): Promise<string | null> {
  try {
    return (await headers()).get("referer");
  } catch {
    return null;
  }
}

async function findTour(slug: string) {
  return db.tour.findUnique({ where: { slug }, include: tourViewerInclude });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tour = await findTour((await params).slug);
  if (!tour) notFound();
  return { title: tour.title };
}

export default async function EmbedTourPage({ params }: Props) {
  const tour = await findTour((await params).slug);
  if (!tour) notFound();
  if (!tour.published) {
    return (
      <main className="embed-unavailable">
        <div className="card">
          <h1>Tour unavailable</h1>
          <p>This tour is unpublished and currently inaccessible.</p>
        </div>
      </main>
    );
  }

  if (!isTourEmbeddable(tour, await requestReferrer())) {
    return <EmbedBlocked />;
  }

  const presentation = presentTour(tour);
  if (!presentation.ok) {
    return (
      <main className="embed-unavailable">
        <div className="card">
          <h1>Tour unavailable</h1>
          <p>{presentation.message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="embed-page">
      <AnalyticsBeacon tourId={tour.id} type="embed_load" surface="embed" />
      <TourViewer presentation={presentation} surface="embed" />
    </main>
  );
}
