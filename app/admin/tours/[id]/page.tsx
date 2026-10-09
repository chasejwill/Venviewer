import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/AdminHeader";
import { AssetManager } from "@/components/AssetManager";
import { EmbedSettingsForm } from "@/components/EmbedSettingsForm";
import { TourForm } from "@/components/TourForm";
import { TourSharing } from "@/components/TourSharing";
import { getCsrfToken, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseEmbedAllowedDomains } from "@/lib/embed/policy";
import { getEnv } from "@/lib/env";
import { tourProviderLabel } from "@/lib/providers/present";

function brandingFields(raw: string | null): {
  logoUrl: string;
  accentColor: string;
} {
  if (!raw) return { logoUrl: "", accentColor: "" };
  try {
    const value = JSON.parse(raw) as {
      logoUrl?: unknown;
      accentColor?: unknown;
    };
    return {
      logoUrl: typeof value.logoUrl === "string" ? value.logoUrl : "",
      accentColor:
        typeof value.accentColor === "string" ? value.accentColor : "",
    };
  } catch {
    return { logoUrl: "", accentColor: "" };
  }
}

export default async function EditTourPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string; assets?: string }>;
}) {
  await requireAdmin();
  const [{ id }, query, csrf] = await Promise.all([
    params,
    searchParams,
    getCsrfToken(),
  ]);
  const tour = await db.tour.findUnique({
    where: { id },
    include: {
      assets: { orderBy: { createdAt: "desc" } },
      analytics: true,
    },
  });
  if (!tour) notFound();
  const branding = brandingFields(tour.branding);

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
          {query.error === "storage" ? (
            <p className="error" role="alert">
              Asset storage is not configured. In production set
              STORAGE_PROVIDER=r2 and the R2 variables.
            </p>
          ) : null}
          {query.error === "upload" ? (
            <p className="error" role="alert">
              The panorama could not be uploaded. Check the file type and size.
            </p>
          ) : null}
          {query.assets === "1" ? (
            <p className="success" role="status">
              Asset uploaded.
            </p>
          ) : null}
          <p className="muted">
            {tour.analytics?.views ?? 0} views ·{" "}
            {tour.analytics?.uniqueViews ?? 0} unique ·{" "}
            {tour.analytics?.embedViews ?? 0} embeds
          </p>
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
        <EmbedSettingsForm
          csrf={csrf}
          tour={{
            id: tour.id,
            embedPolicy: tour.embedPolicy,
            embedAllowedDomains: parseEmbedAllowedDomains(
              tour.embedAllowedDomains,
            ).join("\n"),
            integrationEnabled: tour.integrationEnabled,
            primaryCtaLabel: tour.primaryCtaLabel ?? "",
            primaryCtaUrl: tour.primaryCtaUrl ?? "",
            secondaryCtaLabel: tour.secondaryCtaLabel ?? "",
            secondaryCtaUrl: tour.secondaryCtaUrl ?? "",
            showPoweredByVenview: tour.showPoweredByVenview,
            logoUrl: branding.logoUrl,
            accentColor: branding.accentColor,
          }}
        />
        <AssetManager csrf={csrf} tourId={tour.id} assets={tour.assets} />
        <TourSharing baseUrl={getEnv().VENVIEWER_LITE_BASE_URL} tour={tour} />
      </main>
    </>
  );
}
