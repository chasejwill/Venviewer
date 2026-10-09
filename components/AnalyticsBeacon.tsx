"use client";

import { useEffect } from "react";

export function AnalyticsBeacon({
  tourId,
  type,
  surface,
}: {
  tourId: string;
  type: "viewer_load" | "embed_load";
  surface: "viewer" | "embed";
}) {
  useEffect(() => {
    void fetch("/api/analytics/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tourId, type, surface }),
      keepalive: true,
    });
  }, [tourId, type, surface]);
  return null;
}
