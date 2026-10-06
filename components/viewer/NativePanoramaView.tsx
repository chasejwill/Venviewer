"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { ViewerShell } from "@/components/viewer/ViewerShell";
import { WebGlPanoramaBackend } from "@/components/viewer/webgl-panorama";
import {
  fovDeltaFromPinch,
  fovDeltaFromWheel,
  keyboardLookStep,
  lookDeltaFromDrag,
} from "@/lib/panorama/camera";
import { PanoramaSession, type PanoramaStatus } from "@/lib/panorama/session";
import type { NativeSceneView } from "@/lib/providers/present";

export function NativePanoramaView({
  title,
  scenes,
  initialSceneId,
  surface,
}: {
  title: string;
  scenes: NativeSceneView[];
  initialSceneId: string;
  surface: "public" | "embed";
}) {
  const scene =
    scenes.find((item) => item.id === initialSceneId) ?? scenes[0] ?? null;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<PanoramaSession | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistance = useRef<number | null>(null);
  const reducedRef = useRef(false);
  const helpId = useId();
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<PanoramaStatus>("loading");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !scene) return;
    let cancelled = false;
    const backend = new WebGlPanoramaBackend(canvas, (message) => {
      if (cancelled) return;
      setPhase("error");
      setError(message);
    });
    const camera = {
      yaw: scene.yaw,
      pitch: scene.pitch,
      fov: scene.fov,
    };
    const session = new PanoramaSession(backend, camera);
    session.onChange = (snapshot) => {
      if (cancelled) return;
      setPhase(snapshot.status);
      setProgress(snapshot.progress);
      setError(snapshot.error);
    };
    sessionRef.current = session;
    let frameId = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const rect = canvas.getBoundingClientRect();
      session.frame(
        dt,
        { width: rect.width, height: rect.height },
        reducedRef.current,
      );
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    const upcoming = scenes.find((item) => item.id !== scene.id);
    void session.show(
      { url: scene.textureUrl, camera },
      {
        onEnd: () => {
          if (!upcoming || cancelled) return;
          void session.preload(upcoming.textureUrl).catch(() => undefined);
        },
      },
    );
    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      session.dispose();
      if (sessionRef.current === session) sessionRef.current = null;
    };
  }, [attempt, scene, scenes]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      const session = sessionRef.current;
      if (!session) return;
      event.preventDefault();
      session.camera.applyUserZoom(fovDeltaFromWheel(event.deltaY));
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [scene]);

  function pointerSpan() {
    const points = [...pointers.current.values()];
    if (points.length < 2) return null;
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    pinchDistance.current = pointerSpan();
    sessionRef.current?.interrupt();
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const session = sessionRef.current;
    const previous = pointers.current.get(event.pointerId);
    if (!session || !previous) return;
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (pointers.current.size >= 2) {
      const next = pointerSpan();
      if (pinchDistance.current && next) {
        session.camera.applyUserZoom(
          fovDeltaFromPinch(pinchDistance.current, next),
        );
      }
      pinchDistance.current = next;
      return;
    }
    const delta = lookDeltaFromDrag(
      event.clientX - previous.x,
      event.clientY - previous.y,
      session.camera.state.fov,
      event.currentTarget.clientHeight,
    );
    session.camera.applyUserLook(delta.yaw, delta.pitch);
  }

  function onPointerEnd(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    pinchDistance.current = pointerSpan();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const session = sessionRef.current;
    if (!session) return;
    const step = keyboardLookStep(session.camera.state.fov);
    if (event.key === "ArrowLeft") session.camera.applyUserLook(-step, 0);
    else if (event.key === "ArrowRight") session.camera.applyUserLook(step, 0);
    else if (event.key === "ArrowUp") session.camera.applyUserLook(0, step);
    else if (event.key === "ArrowDown") session.camera.applyUserLook(0, -step);
    else if (event.key === "+" || event.key === "=")
      session.camera.applyUserZoom(-4);
    else if (event.key === "-" || event.key === "_")
      session.camera.applyUserZoom(4);
    else return;
    event.preventDefault();
  }

  if (!scene) {
    return (
      <ViewerShell
        title={title}
        surface={surface}
        showTitle={surface === "public"}
        phase="error"
        progress={null}
        error="This tour cannot be displayed."
      >
        <div className="viewer-stage" />
      </ViewerShell>
    );
  }

  return (
    <ViewerShell
      title={title}
      surface={surface}
      showTitle={surface === "public"}
      phase={phase}
      progress={progress}
      error={error}
      onRetry={() => setAttempt((value) => value + 1)}
    >
      <div
        ref={stageRef}
        className="viewer-stage"
        tabIndex={0}
        role="application"
        aria-label={`Spatial view of ${scene.title}`}
        aria-describedby={helpId}
        data-scene-id={scene.id}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={onKeyDown}
      >
        <canvas ref={canvasRef} className="viewer-canvas" aria-hidden="true" />
        <p id={helpId} className="viewer-help">
          Drag, swipe, or use arrow keys to look. Pinch, scroll, or use plus and
          minus to zoom.
        </p>
      </div>
    </ViewerShell>
  );
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}
