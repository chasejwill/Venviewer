"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ViewerButton } from "@/components/viewer/ViewerButton";
import type { PanoramaStatus } from "@/lib/panorama/session";

export function ViewerShell({
  title,
  surface,
  showTitle,
  phase,
  progress,
  error,
  onRetry,
  children,
}: {
  title: string;
  surface: "public" | "embed";
  showTitle: boolean;
  phase: PanoramaStatus;
  progress: number | null;
  error: string | null;
  onRetry?: () => void;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => {
      setFullscreen(document.fullscreenElement === rootRef.current);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function toggleFullscreen() {
    const element = rootRef.current;
    if (!element) return;
    try {
      if (document.fullscreenElement === element) {
        await document.exitFullscreen();
      } else {
        await element.requestFullscreen();
      }
    } catch {
      setFullscreen(document.fullscreenElement === element);
    }
  }

  const percent =
    typeof progress === "number" ? Math.round(progress * 100) : null;

  return (
    <section
      ref={rootRef}
      className={`viewer-shell viewer-shell-${surface}`}
      data-provider="venviewer-native"
      aria-labelledby={showTitle ? titleId : undefined}
      aria-label={showTitle ? undefined : title}
    >
      <div className="viewer-chrome">
        {showTitle ? (
          <h1 id={titleId} className="viewer-title">
            {title}
          </h1>
        ) : (
          <span />
        )}
        <ViewerButton
          aria-pressed={fullscreen}
          aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          onClick={() => void toggleFullscreen()}
        >
          <FullscreenIcon expanded={fullscreen} />
        </ViewerButton>
      </div>
      {children}
      {phase === "error" ? (
        <div className="viewer-status" role="alert">
          <p>{error ?? "This view could not be loaded."}</p>
          {onRetry ? (
            <ViewerButton onClick={onRetry}>Try again</ViewerButton>
          ) : null}
        </div>
      ) : null}
      {phase === "loading" ? (
        <div className="viewer-status" role="status" aria-live="polite">
          <span className="viewer-spinner" aria-hidden="true" />
          <p>
            {percent === null ? "Loading view" : `Loading view ${percent}%`}
          </p>
          {percent === null ? null : (
            <progress max={1} value={progress ?? undefined} />
          )}
        </div>
      ) : null}
    </section>
  );
}

function FullscreenIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      {expanded ? (
        <path
          d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M9 4H4v5M15 4h5v5M4 15v5h5M20 15v5h-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
