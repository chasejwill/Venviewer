"use client";

import { useState } from "react";

export function LegacyKuulaFrame({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="viewer-container" data-provider="legacy-kuula">
      {!loaded ? (
        <div className="viewer-loading" role="status" aria-live="polite">
          <span>Loading virtual tour…</span>
        </div>
      ) : null}
      <iframe
        className="viewer"
        src={src}
        title={title}
        width="100%"
        height="100%"
        allow="fullscreen; xr-spatial-tracking"
        allowFullScreen
        loading="lazy"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
