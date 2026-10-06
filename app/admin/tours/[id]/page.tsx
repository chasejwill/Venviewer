import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/AdminHeader";
import { TourForm } from "@/components/TourForm";
import { TourSharing } from "@/components/TourSharing";
import { getCsrfToken, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { tourProviderLabel } from "@/lib/providers/present";

export default async function EditTourPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAdmin();
  const [{ id }, query, csrf] = await Promise.all([
    params,
    searchParams,
    getCsrfToken(),
  ]);
  const tour = await db.tour.findUnique({ where: { id } });
  if (!tour) notFound();

  return (
    <>
      <AdminHeader csrf={csrf} />
      <main className="shell stack">
        <div>
          <Link href="/admin/tours">← Tours</Link>
          <h1>Edit tour</h1>
          <p className="muted">Provider: {tourProviderLabel(tour.provider)}</p>
          {query.saved === "1" ? (
            <p className="success" role="status">
              Changes saved.
            </p>
          ) : null}
          {query.error === "native-unpublished" ? (
            <p className="error" role="alert">
              Add a valid default scene before publishing a native tour.
            </p>
          ) : null}
        </div>
        {tour.provider === "legacy-kuula" && tour.kuulaUrl ? (
          <TourForm csrf={csrf} tour={{ ...tour, kuulaUrl: tour.kuulaUrl }} />
        ) : (
          <section className="card stack">
            <h2>Native tour</h2>
            <p>
              This tour uses the Venviewer runtime. Scene authoring is not
              available in this release. Public and embed links already use the
              Venviewer URL.
            </p>
          </section>
        )}
        <TourSharing baseUrl={getEnv().VENVIEWER_LITE_BASE_URL} tour={tour} />
      </main>
    </>
  );
}
