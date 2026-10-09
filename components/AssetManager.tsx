import { AssetDeleteButton } from "@/components/AssetDeleteButton";

type AssetRow = {
  id: string;
  originalFilename: string | null;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  processingStatus: string;
  lifecycleStatus: string;
  processingError: string | null;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AssetManager({
  csrf,
  tourId,
  assets,
}: {
  csrf: string;
  tourId: string;
  assets: AssetRow[];
}) {
  return (
    <section className="card stack" aria-labelledby="assets-heading">
      <h2 id="assets-heading">Assets</h2>
      <p className="muted">
        Panorama uploads stay private. Previews are delivered through a
        short-lived session or token, not a public object URL.
      </p>
      <form
        action={`/api/tours/${tourId}/assets/upload`}
        method="post"
        encType="multipart/form-data"
        className="stack"
      >
        <input type="hidden" name="csrf" value={csrf} />
        <input type="hidden" name="redirect" value="admin" />
        <label>
          Panorama image
          <input
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
          />
        </label>
        <button type="submit">Upload panorama</button>
      </form>
      {assets.length === 0 ? (
        <p>No assets yet.</p>
      ) : (
        <ul className="asset-list">
          {assets.map((asset) => {
            const ready =
              asset.processingStatus === "ready" &&
              asset.lifecycleStatus === "active";
            return (
              <li key={asset.id} className="asset-row">
                {ready ? (
                  // eslint-disable-next-line @next/next/no-img-element -- session-authenticated delivery, not a public image
                  <img
                    alt=""
                    className="asset-thumb"
                    src={`/api/assets/${asset.id}/delivery?variant=thumbnail`}
                  />
                ) : (
                  <span className="asset-thumb asset-thumb-empty" />
                )}
                <div>
                  <strong>{asset.originalFilename ?? asset.id}</strong>
                  <p className="muted">
                    {asset.lifecycleStatus} · {asset.processingStatus} ·{" "}
                    {formatBytes(asset.byteSize)}
                    {asset.width && asset.height
                      ? ` · ${asset.width}×${asset.height}`
                      : ""}
                  </p>
                  {asset.processingError ? (
                    <p className="error">{asset.processingError}</p>
                  ) : null}
                  <div className="actions">
                    {asset.lifecycleStatus === "active" ? (
                      <form
                        action={`/api/assets/${asset.id}/archive`}
                        method="post"
                      >
                        <input type="hidden" name="csrf" value={csrf} />
                        <input type="hidden" name="redirect" value="admin" />
                        <button className="secondary" type="submit">
                          Archive
                        </button>
                      </form>
                    ) : null}
                    <form
                      action={`/api/assets/${asset.id}/delete`}
                      method="post"
                    >
                      <input type="hidden" name="csrf" value={csrf} />
                      <input type="hidden" name="redirect" value="admin" />
                      <AssetDeleteButton />
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
