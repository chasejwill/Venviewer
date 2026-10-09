"use client";

import { LegacyKuulaFrame } from "@/components/viewer/LegacyKuulaFrame";
import { NativePanoramaView } from "@/components/viewer/NativePanoramaView";
import type { ViewerPresentation } from "@/lib/providers/present";

export function TourViewer({
  presentation,
  surface,
}: {
  presentation: Extract<ViewerPresentation, { ok: true }>;
  surface: "public" | "embed";
}) {
  if (presentation.provider === "legacy-kuula") {
    return (
      <LegacyKuulaFrame
        src={presentation.embedUrl}
        title={presentation.title}
      />
    );
  }
  return (
    <NativePanoramaView
      title={presentation.title}
      scenes={presentation.scenes}
      initialSceneId={presentation.initialSceneId}
      surface={surface}
    />
  );
}
