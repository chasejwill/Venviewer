import Link from "next/link";
import { deleteTourAction, togglePublishedAction } from "@/app/actions";
import { AdminHeader } from "@/components/AdminHeader";
import { CopyButton } from "@/components/CopyButton";
import { DeleteButton } from "@/components/DeleteButton";
import { SubmitButton } from "@/components/SubmitButton";
import { getCsrfToken, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { tourProviderLabel } from "@/lib/providers/present";
import { tourSharing } from "@/lib/sharing";

export const dynamic = "force-dynamic";

export default async function ToursPage() {
  await requireAdmin();
  const [csrf, tours] = await Promise.all([
    getCsrfToken(),
    db.tour.findMany({
      orderBy: { updatedAt: "desc" },
      include: { analytics: true },
    }),
  ]);
  const baseUrl = getEnv().VENVIEWER_LITE_BASE_URL;

  return (
    <>
      <AdminHeader csrf={csrf} />
      <main className="shell stack">
        <div className="header-row">
          <div>
            <h1>Tours</h1>
            <p className="muted">Create, publish, and share virtual tours.</p>
          </div>
          <Link className="button" href="/admin/tours/new">
            New tour
          </Link>
        </div>
        <div className="card table-wrap">
          {tours.length === 0 ? (
            <p>No tours yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Tour</th>
                  <th>Status</th>
                  <th>Views</th>
                  <th>Links</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tours.map((tour) => {
                  const sharing = tourSharing(baseUrl, tour);
                  return (
                    <tr key={tour.id}>
                      <td>
                        <strong>{tour.title}</strong>
                        <br />
                        <code>/{tour.slug}</code>
                        <br />
                        <span className="muted">
                          {tourProviderLabel(tour.provider)}
                        </span>
                      </td>
                      <td>{tour.published ? "Published" : "Draft"}</td>
                      <td>
                        {tour.analytics?.views ?? 0} views
                        <br />
                        <span className="muted">
                          {tour.analytics?.uniqueViews ?? 0} unique ·{" "}
                          {tour.analytics?.embedViews ?? 0} embeds
                        </span>
                      </td>
                      <td>
                        <div className="actions">
                          <a
                            href={sharing.publicUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open public
                          </a>
                          <a
                            href={sharing.embedUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open embed
                          </a>
                          <CopyButton
                            value={sharing.publicUrl}
                            label="Copy link"
                          />
                          <CopyButton
                            value={sharing.embedUrl}
                            label="Copy embed URL"
                          />
                          <CopyButton
                            value={sharing.iframeCode}
                            label="Copy iframe"
                          />
                        </div>
                      </td>
                      <td>
                        <div className="actions">
                          <Link href={`/admin/tours/${tour.id}`}>Edit</Link>
                          <form
                            action={togglePublishedAction.bind(null, tour.id)}
                          >
                            <input type="hidden" name="csrf" value={csrf} />
                            <SubmitButton className="secondary">
                              {tour.published ? "Unpublish" : "Publish"}
                            </SubmitButton>
                          </form>
                          <form action={deleteTourAction.bind(null, tour.id)}>
                            <input type="hidden" name="csrf" value={csrf} />
                            <DeleteButton />
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </>
  );
}
